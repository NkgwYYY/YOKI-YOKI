import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText, MediaFrame } from '@/lib/video';

export const Scene2 = () => {
  return (
    <SceneLayout className="flex flex-col items-center justify-center">
      <SafeFrame className="flex flex-col h-full w-full relative">
        <div className="absolute top-[10vh] left-[5vw] z-20">
          <VideoText
            className="text-[var(--color-primary)] font-bold leading-tight"
            scale="heading"
            style={{ fontSize: '7vw' }}
          >
            <motion.span
              className="block"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              今の気持ちを、
            </motion.span>
          </VideoText>
          <VideoText
            className="text-[var(--color-accent)] font-black leading-tight mt-[1vw]"
            scale="display"
            style={{ fontSize: '9vw' }}
          >
            <motion.span
              className="block"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -30, opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            >
              選ぶだけ
            </motion.span>
          </VideoText>
        </div>

        {/* Device 1: Mood record */}
        <motion.div
          className="absolute top-[30vh] left-[10vw] w-[60vw] h-[120vw] rounded-[3vw] overflow-hidden shadow-xl border-4 border-white z-10 origin-bottom-left"
          initial={{ x: '50vw', y: '20vh', rotate: 15, opacity: 0 }}
          animate={{ x: 0, y: 0, rotate: -5, opacity: 1 }}
          exit={{ x: '-30vw', opacity: 0, rotate: -15 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/02-mood-record.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        {/* Device 2: Feed care */}
        <motion.div
          className="absolute top-[45vh] right-[5vw] w-[50vw] h-[100vw] rounded-[3vw] overflow-hidden shadow-2xl border-4 border-white z-20 origin-bottom-right"
          initial={{ x: '50vw', y: '30vh', rotate: 25, opacity: 0 }}
          animate={{ x: 0, y: 0, rotate: 5, opacity: 1 }}
          exit={{ x: '30vw', opacity: 0, rotate: 15 }}
          transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/13-feed-care.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        {/* Decor: Floating shape */}
        <motion.div
          className="absolute bottom-[10vh] left-[15vw] w-[20vw] h-[20vw] bg-[var(--color-bg-light)] rounded-full z-0 flex items-center justify-center text-[var(--color-accent)] font-bold text-[4vw] shadow-lg"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ delay: 1, duration: 0.8, type: 'spring', bounce: 0.5 }}
        >
          ご飯も！
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
};
