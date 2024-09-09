import React, { useEffect, useCallback, useState, useContext } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import { useParams } from "react-router-dom";
import { UserInfo } from "../App";
import styles from "../styles/RoomPage.module.css";

const Room = () => {
  const { socket, interviewer } = useSocket();
  const { room } = useParams();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [email, setEmail] = useState("");
  const { uMail, setUMail } = useContext(UserInfo);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    setEmail(uMail);
    socket.emit("room:join", { email: uMail, room });

    // Initialize speech recognition
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.addEventListener('result', (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setNewMessage(transcript);
      });

      recognitionInstance.addEventListener('end', () => {
        recognitionInstance.start();
      });

      setRecognition(recognitionInstance);
    } else {
      console.error('Speech Recognition API not supported');
    }
  }, [room, socket, uMail]);

  const handleUserJoined = useCallback(({ email, id }) => {
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncommingCall = useCallback(async ({ from, offer }) => {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    setMyStream(stream);
    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { to: from, ans });
  }, [socket]);

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(({ from, ans }) => {
    peer.setLocalDescription(ans);
    sendStreams();
  }, [sendStreams]);

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncomming = useCallback(async ({ from, offer }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit("peer:nego:done", { to: from, ans });
  }, [socket]);

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    });
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      socket.emit("chat:message", { room, message: newMessage, email });
      setMessages((prev) => [...prev]);
      setNewMessage("");
    }
  };
  const startRecognition = () => {
    if (recognition) {
      recognition.start();
      console.log("Speech Recognition started");
    }
  };

  const stopRecognition = () => {
    if (recognition) {
      recognition.stop();
      console.log("Speech Recognition stopped");
    }
  };
  useEffect(() => {
    socket.on("chat:message", ({ message, email }) => {
      setMessages((prev) => [...prev, { email, message }]);
      if (message && email !== uMail) {
        const speech = new SpeechSynthesisUtterance(message);
        window.speechSynthesis.speak(speech);
      }
    });

    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("chat:message");
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal, uMail]);

  return (
    <>
      <div className={styles.mainContainer}>
        <div className={styles.container}>
          <div className={styles.infoSection}>
            <h1>You Have been logged in as {interviewer ? "Interviewer" : "Candidate"}</h1>
            <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
            {myStream && <button className={styles.actionButton} onClick={sendStreams}>Send Stream</button>}
            {remoteSocketId && <button className={styles.actionButton} onClick={handleCallUser}>CALL</button>}
          </div>
          <div className={styles.videoContainer}>
            <div className={styles.largePlayer}>
              {myStream && (
                <ReactPlayer
                  playing
                  muted
                  height="100%"
                  width="100%"
                  url={myStream}
                />
              )}
            </div>
            <div className={styles.smallPlayer}>
              {remoteStream && (
                <ReactPlayer
                  playing
                  muted
                  height="100px"
                  width="200px"
                  url={remoteStream}
                />
              )}
            </div>
          </div>
        </div>

        <div className={styles.chatContainer}>
          <h2>Chat</h2>
          <div className={styles.chatInput}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button className={styles.chatButton} onClick={handleSendMessage}>Send</button>
          </div>
          <div className={styles.chatWindow}>
            {messages.map((msg, index) => (
              <div key={index} className={styles.chatMessage}>
                <strong>{msg.email}:</strong> {msg.message}
              </div>
            ))}
          </div>
          <button
            className={styles.chatButton}
            onClick={startRecognition}
          >
            Start Speech Recognition
          </button>
          <button
            className={styles.chatButton}
            onClick={stopRecognition}
          >
            Stop Speech Recognition
          </button>
        </div>
      </div>
    </>
  );
};

export default Room;