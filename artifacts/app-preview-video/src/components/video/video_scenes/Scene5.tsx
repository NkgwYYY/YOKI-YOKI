import { motion } from 'framer-motion';
import { SceneLayout, SafeFrame, VideoText, MediaFrame } from '@/lib/video';

export const Scene5 = () => {
  return (
    <SceneLayout className="flex flex-col items-center justify-center">
      <SafeFrame className="flex flex-col h-full w-full relative items-center justify-center">
        
        {/* App Logo / Name */}
        <motion.div
          className="z-20 text-center flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.4 }}
        >
          <VideoText
            className="text-[var(--color-primary)] font-black tracking-widest drop-shadow-lg"
            scale="display"
            style={{ fontSize: '13vw' }}
          >
            YOKI YOKI
          </VideoText>
          
          <motion.div
            className="mt-[4vw] bg-[var(--color-accent)] text-white px-[6vw] py-[2vw] rounded-full shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
          >
            <VideoText scale="body" style={{ fontSize: '5vw' }} className="font-bold">
              App Storeで無料ダウンロード
            </VideoText>
          </motion.div>
        </motion.div>

        {/* Character element (using home screenshot zoomed in) */}
        <motion.div
          className="absolute bottom-[-10vh] w-[90vw] h-[90vw] rounded-full overflow-hidden shadow-2xl border-[1vw] border-white z-10 bg-white"
          initial={{ y: '30vh', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '50vh', opacity: 0 }}
          transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
           <div className="w-full h-full relative">
             <MediaFrame position="bottom">
               <img src={`${import.meta.env.BASE_URL}images/01-home.jpg`} alt="" style={{ transform: 'scale(1.8) translateY(10%)', transformOrigin: 'bottom center' }} />
             </MediaFrame>
           </div>
        </motion.div>

      </SafeFrame>
    </SceneLayout>
  );
};
