// ============================================================
// TAX CHAT PAGE - Uses Smart AI
// ============================================================

import React from "react";
import { useNavigate } from "react-router-dom";
import SmartChatInterface from "../components/SmartChatInterface";
import { useAuth } from "../App";

export default function TaxChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Build currentUser object for SmartChatInterface
  const currentUser = user ? {
    id: user.id,
    name: user.name,
    firstName: user.firstName || user.name?.split(" ")[0],
    lastName: user.lastName || user.name?.split(" ").slice(1).join(" "),
    email: user.email,
    picture: user.picture,
  } : null;

  return <SmartChatInterface currentUser={currentUser} onNavigate={navigate} />;
}