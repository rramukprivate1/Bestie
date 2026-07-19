import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import LoginScreen from './components/LoginScreen';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const auth = useAuth();
  const chat = useChat(auth.uid, auth.cryptoKey, auth.profileSummary);

  const isUnlocked = auth.status === 'unlocked';

  return (
    <div className="h-screen w-screen overflow-hidden bg-deep font-body">
      <AnimatePresence mode="wait">
        {isUnlocked ? (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <ChatWindow chat={chat} onLogout={auth.logOut} />
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
