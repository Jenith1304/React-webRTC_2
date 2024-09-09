import React, { useState, useCallback, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { UserInfo } from "../App";
import styles from "../styles/Lobby.module.css";

const LobbyScreen = () => {
  const context = useContext(UserInfo);
  const [selectedOption, setSelectedOption] = useState("");
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const { socket, interviewer, setInterviewer } = useSocket();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    if (value === "Interviewer") {
      setInterviewer(true);
    } else {
      setInterviewer(false);
    }
  };

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      localStorage.setItem("email", email);
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className={styles.loginContainer}>
      <div className={styles.blueStrip}></div>
      <div className={styles.loginHeading}>
        <h1>Login</h1>
        <p>Log In and get access to all the features</p>
      </div>
      <div className={styles.loginForm}>
        <div className={styles.formLogin}>
          <form onSubmit={handleSubmitForm}>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={context.uMail}
              onChange={(e) => context.setUMail(e.target.value)}
            />
            <select id="role" name="role" value={selectedOption} onChange={handleChange}>
              <option value="">--Select an option--</option>
              <option value="Interviewer">Interviewer</option>
              <option value="Candidate">Candidate</option>
            </select>
            <input
              type="text"
              id="room"
              placeholder="Room Number"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LobbyScreen;
