import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { useJournal } from './hooks/useJournal';
import LoginScreen from './components/LoginScreen';
import ChatWindow from './components/ChatWindow';
import JournalView from './components/JournalView';
import InsightsView from './components/InsightsView';
import BottomNav from './components/BottomNav';

export default function App() {
  const auth = useAuth();
  const chat = useChat(auth.uid, auth.cryptoKey, auth.profileSummary);
  const journal = useJournal(auth.uid, auth.cryptoKey);
  const [activeTab, setActiveTab] = useState('chat');

  const isUnlocked = auth.status === 'unlocked';

  return (
    <div className="h-screen w-screen overflow-hidden bg-deep font-body">
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex flex-col"
          >
            <div className="flex-1 min-h-0">
              {activeTab === 'chat' && <ChatWindow chat={chat} onLogout={auth.logOut} />}
              {activeTab === 'journal' && <JournalView journal={journal} />}
              {activeTab === 'insights' && (
                <InsightsView uid={auth.uid} messages={chat.messages} journalEntries={journal.entries} />
              )}
            </div>
            <BottomNav active={activeTab} onChange={setActiveTab} />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <LoginScreen status={auth.status} error={auth.error} onSignUp={auth.signUp} onLogIn={auth.logIn} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
