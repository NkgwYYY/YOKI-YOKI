import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText, MediaFrame } from '@/lib/video';

export const Scene4 = () => {
  return (
    <SceneLayout className="flex flex-col items-center justify-center">
      <SafeFrame className="flex flex-col h-full w-full relative">
        <div className="absolute top-[8vh] left-[5vw] z-30">
          <VideoText
            className="text-[var(--color-primary)] font-bold leading-tight"
            scale="heading"
            style={{ fontSize: '7vw' }}
          >
            <motion.span
              className="block"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              ミニゲームや
            </motion.span>
          </VideoText>
          <VideoText
            className="text-[var(--color-accent)] font-black leading-tight mt-[1vw]"
            scale="heading"
            style={{ fontSize: '8vw' }}
          >
            <motion.span
              className="block"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
            >
              あなたの成長記録も
            </motion.span>
          </VideoText>
        </div>

        {/* Feature 1: Growth */}
        <motion.div
          className="absolute top-[22vh] left-[5vw] w-[45vw] h-[90vw] rounded-[2.5vw] overflow-hidden shadow-lg border-2 border-white z-10"
          initial={{ y: '20vh', opacity: 0, rotate: -10 }}
          animate={{ y: 0, opacity: 1, rotate: -5 }}
          exit={{ y: '-20vh', opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/04-growth.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        {/* Feature 2: Solar Plant */}
        <motion.div
          className="absolute top-[35vh] right-[5vw] w-[48vw] h-[96vw] rounded-[2.5vw] overflow-hidden shadow-xl border-2 border-white z-20"
          initial={{ y: '30vh', opacity: 0, rotate: 15 }}
          animate={{ y: 0, opacity: 1, rotate: 8 }}
          exit={{ y: '-10vh', opacity: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/05-solar-plant.jpg`} alt="" />
          </MediaFrame>
        </motion.div>

        {/* Feature 3: Rhythm Game */}
        <motion.div
          className="absolute bottom-[10vh] left-[15vw] w-[50vw] h-[100vw] rounded-[2.5vw] overflow-hidden shadow-2xl border-4 border-white z-30"
          initial={{ y: '40vh', opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: -2 }}
          exit={{ y: '20vh', opacity: 0 }}
          transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <MediaFrame>
            <img src={`${import.meta.env.BASE_URL}images/15-rhythm-game.jpg`} alt="" />
          </MediaFrame>
        </motion.div>
      </SafeFrame>
    </SceneLayout>
  );
};
