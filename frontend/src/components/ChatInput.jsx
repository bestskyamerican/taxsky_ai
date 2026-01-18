// ============================================================
// TAXSKY CHAT INPUT - PROFESSIONAL DARK THEME
// ============================================================
// Reusable chat input with file upload and quick actions
// ============================================================

import React, { useRef, useState } from "react";

const getLanguage = () => localStorage.getItem("taxsky_language") || "en";

const TRANSLATIONS = {
  en: {
    placeholder: "Type your message or ask a tax question...",
    upload: "Upload Document",
    send: "Send",
    start: "Start",
    yes: "Yes",
    no: "No",
  },
  vi: {
    placeholder: "Nhập tin nhắn hoặc hỏi về thuế...",
    upload: "Tải Tài Liệu",
    send: "Gửi",
    start: "Bắt Đầu",
    yes: "Đúng",
    no: "Không",
  },
  es: {
    placeholder: "Escribe tu mensaje o pregunta sobre impuestos...",
    upload: "Subir Documento",
    send: "Enviar",
    start: "Comenzar",
    yes: "Sí",
    no: "No",
  }
};

export default function ChatInput({ 
  onSend, 
  onUpload, 
  isLoading = false, 
  isUploading = false,
  quickActions = [],
  showDefaultActions = true 
}) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef(null);
  const [language] = useState(getLanguage());
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onUpload) {
      onUpload(file);
    }
    e.target.value = "";
  };

  const handleQuickAction = (text) => {
    if (onSend) onSend(text);
  };

  const defaultActions = [
    { text: "hello", label: `👋 ${t.start}`, color: "green" },
    { text: "yes", label: `✅ ${t.yes}`, color: "blue" },
    { text: "no", label: `❌ ${t.no}`, color: "red" },
    { text: "married filing jointly", label: "💑 MFJ", color: "purple" },
    { text: "single", label: "👤 Single", color: "gray" },
    { text: "W-2", label: "📄 W-2", color: "blue" },
  ];

  const actions = quickActions.length > 0 ? quickActions : (showDefaultActions ? defaultActions : []);

  const getActionStyle = (color) => {
    const colors = {
      green: { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
      blue: { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
      red: { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
      purple: { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
      gray: { background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
    };
    return colors[color] || colors.gray;
  };

  return (
    <div style={styles.container}>
      {/* Input Row */}
      <div style={styles.inputRow}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,.pdf"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={styles.uploadBtn}
          title={t.upload}
        >
          {isUploading ? "⏳" : "📎"}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={t.placeholder}
          style={styles.input}
          disabled={isLoading}
        />

        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            ...styles.sendBtn,
            opacity: (isLoading || !input.trim()) ? 0.5 : 1
          }}
        >
          {isLoading ? "⏳" : "📤"}
        </button>
      </div>

      {/* Quick Actions */}
      {actions.length > 0 && (
        <div style={styles.quickActions}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.text)}
              style={{
                ...styles.quickBtn,
                ...getActionStyle(action.color)
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: 20,
    background: 'rgba(255,255,255,0.02)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  inputRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  uploadBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  input: {
    flex: 1,
    padding: '14px 20px',
    fontSize: 15,
    color: '#fff',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    cursor: 'pointer',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  quickActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickBtn: {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};