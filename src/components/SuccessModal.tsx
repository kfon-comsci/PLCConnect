import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-[24px] max-w-md w-full p-6 md:p-8 shadow-2xl relative z-10 border border-[#F5F4F7] text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 mb-5 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-semibold text-gray-950 mb-3">
              บันทึกข้อมูลสำเร็จ
            </h3>
            
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              ✅ คุณได้บันทึกข้อมูลเรียบร้อยแล้ว
            </p>

            <button
              id="success-modal-ok-btn"
              type="button"
              onClick={onClose}
              className="w-full h-[48px] bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:from-[#6b48a0] hover:to-[#ce2989] text-white font-medium text-lg rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
            >
              ตกลง (OK)
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
