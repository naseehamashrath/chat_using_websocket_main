import React, { useState, useRef, useEffect } from "react";
import './App.css';

function App() {
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [msgList, setMsgList] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const roomInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!joined) return;

    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join",
        payload: { room: roomId },
      }));
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "chat") {
        setMsgList(prev => [...prev, data.payload.message]);
        setTyping(false);
      } else if (data.type === "typing") {
        setTyping(true);
        setTimeout(() => setTyping(false), 2000);
      } else if (data.type === "system") {
        setMsgList(prev => [...prev, `[System]: ${data.payload.message}`]);
      }
    };

    wsRef.current = ws;
    return () => ws.close();
  }, [joined, roomId]);

  const handleSendMessage = () => {
    const message = messageInputRef.current?.value.trim();
    if (!message || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({
      type: "chat",
      payload: { message },
    }));

    messageInputRef.current.value = "";
  };

  const handleTyping = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "typing" }));
    }
  };

  const handleJoinRoom = () => {
    const room = roomInputRef.current?.value.trim();
    if (!room) return;
    setRoomId(room);
    setJoined(true);
  };

  return (
    <div className="container">
      {!joined ? (
        <div className="joinContainer">
          <input ref={roomInputRef} type="text" placeholder="Enter Room ID..." className="input" />
          <button className="button" onClick={handleJoinRoom}>Join Room</button>
        </div>
      ) : (
        <>
          <div className="chatContainer">
            {msgList.map((msg, idx) => (
              <div key={idx} className="message">{msg}</div>
            ))}
            {typing && <div className="typing">Someone is typing...</div>}
          </div>
          <div className="inputRow">
            <input
              ref={messageInputRef}
              type="text"
              placeholder="Type your message..."
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
                else handleTyping();
              }}
            />
            <button className="button" onClick={handleSendMessage}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
