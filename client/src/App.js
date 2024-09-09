import { Routes, Route } from "react-router-dom";
import "./App.css";
import LobbyScreen from "./screens/Lobby";
import RoomPage from "./screens/Room";
import { createContext, useState } from "react";

export const UserInfo = createContext()

function App() {

  const [uMail,setUMail] = useState("")

  const UserInfoObj = {
    uMail,setUMail
  }

  return (
    <div className="App">
      <UserInfo.Provider value={UserInfoObj}>
      <Routes>
        <Route path="/" element={<LobbyScreen />} />
        <Route path="/room/:room" element={<RoomPage />} />
      </Routes>
      </UserInfo.Provider>
    </div>
  );
}

export default App;
