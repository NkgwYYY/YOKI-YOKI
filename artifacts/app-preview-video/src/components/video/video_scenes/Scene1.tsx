import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText, MediaFrame } from '@/lib/video';

export const Scene1 = () => {
  return (
    <SceneLayout className="flex flex-col items-center justify-center p-8">
      <SafeFrame className="flex flex-col items-center justify-center h-full w-full relative">
        <motion.div
          className="absolute top-1/2 left-1/2 w-[70vw] h-[140vw] rounded-[3vw] overflow-hidden shadow-2xl border-4 border-white/50"
          initial={{ x: '-50%', y: '-30%', opacity: 0, scale: 0.9, rotateX: 10 }}
          animate={{ x: '-50%', y: '-50%', opacity: 1, scale: 1, rotateX: 0 }}
          exit={{ x: '-50%', y: '-80%', opacity: 0, scale: 0.8 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d', zIndex: 10 }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/01-home.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        <div className="absolute top-[15vh] w-full text-center z-20">
          <VideoText
            className="text-[var(--color-primary)] font-bold drop-shadow-md"
            scale="heading"
            style={{ fontSize: '7vw' }}
          >
            <motion.span
              className="block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            >
              あなたの毎日に、
            </motion.span>
          </VideoText>
          <VideoText
            className="text-[var(--color-accent)] font-black drop-shadow-md mt-[2vw]"
            scale="display"
            style={{ fontSize: '9vw' }}
          >
            <motion.span
              className="block"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
            >
              小さな癒しを。
            </motion.span>
          </VideoText>
        </div>
      </SafeFrame>
    </SceneLayout>
  );
};
