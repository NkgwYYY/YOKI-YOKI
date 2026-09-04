import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText, MediaFrame } from '@/lib/video';

export const Scene3 = () => {
  return (
    <SceneLayout className="flex flex-col items-center justify-center">
      <SafeFrame className="flex flex-col h-full w-full relative">
        <div className="absolute top-[12vh] w-full text-center z-20">
          <VideoText
            className="text-[var(--color-primary)] font-bold drop-shadow-sm"
            scale="heading"
            style={{ fontSize: '6vw' }}
          >
            <motion.span
              className="block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              AIの「こころん」が
            </motion.span>
          </VideoText>
          <VideoText
            className="text-[var(--color-accent)] font-black drop-shadow-sm mt-[2vw]"
            scale="heading"
            style={{ fontSize: '8vw' }}
          >
            <motion.span
              className="block"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
            >
              優しく寄り添うよ
            </motion.span>
          </VideoText>
        </div>

        {/* Device: AI Chat */}
        <motion.div
          className="absolute top-[25vh] left-1/2 w-[75vw] h-[150vw] rounded-[3vw] overflow-hidden shadow-2xl border-4 border-white z-10"
          initial={{ x: '-50%', y: '30vh', opacity: 0, scale: 0.8 }}
          animate={{ x: '-50%', y: '-10%', opacity: 1, scale: 1 }}
          exit={{ x: '-50%', y: '50vh', opacity: 0, scale: 0.9 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/03-ai-chat.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        {/* Chat bubble decor */}
        <motion.div
          className="absolute top-[40vh] right-[5vw] bg-white p-[3vw] rounded-[2vw] rounded-br-none shadow-xl z-20 border-2 border-[var(--color-bg-muted)]"
          initial={{ scale: 0, x: 20, opacity: 0 }}
          animate={{ scale: 1, x: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ delay: 1, duration: 0.6, type: 'spring', bounce: 0.6 }}
        >
          <VideoText scale="body" style={{ fontSize: '5vw' }} className="text-[var(--color-primary)] font-bold">
            がんばったね！
          </VideoText>
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
};
