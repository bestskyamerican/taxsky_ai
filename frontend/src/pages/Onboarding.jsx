import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";

export default function Onboarding() {
  const [language, setLanguage] = useState("en");
  const [state, setState] = useState("CA");

  const navigate = useNavigate();
  const { setPreferences } = useAuth();

  const startChat = () => {
    // Use context to set preferences (this triggers re-render)
    setPreferences(language, state);
    // Navigate to chat
    navigate("/taxchat");
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Welcome to TaxSky – AI CPA Assistant
      </h1>

      {/* Language Selection */}
      <label className="block mb-4">
        <span className="font-semibold">Choose Language</span>
        <select
          className="w-full border p-2 rounded mt-1"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="vi">Vietnamese</option>
          <option value="es">Spanish</option>
        </select>
      </label>

      {/* State Selection */}
      <label className="block mb-6">
        <span className="font-semibold">Your State</span>
        <select
          className="w-full border p-2 rounded mt-1"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="CA">California</option>
          <option value="TX">Texas</option>
          <option value="NY">New York</option>
          <option value="FL">Florida</option>
          <option value="WA">Washington</option>
        </select>
      </label>

      <button
        onClick={startChat}
        className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg"
      >
        Start Chat
      </button>
    </div>
  );
}