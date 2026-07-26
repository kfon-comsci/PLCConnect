import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { AppUser } from '../types';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: AppUser | null;
  onVerifySuccess: (user: AppUser) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onVerifySuccess
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset state when modal opens or target user changes
  useEffect(() => {
    if (isOpen) {
      setPasswordInput('');
      setShowPassword(false);
      setErrorMsg('');
    }
  }, [isOpen, targetUser]);

  if (!targetUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check password
    // In our system, default users have preset passwords like 'admin1234'. 
    // Newly created users have passwords stored in user.password.
    const actualPassword = targetUser.password || '';
    
    if (passwordInput === actualPassword) {
      onVerifySuccess(targetUser);
      onClose();
    } else {
      setErrorMsg('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

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
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-[24px] max-w-md w-full p-6 md:p-8 shadow-2xl relative z-10 border border-gray-100"
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#7D57B2]/10 flex items-center justify-center text-[#7D57B2] mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-950">
                สลับบทบาทผู้ใช้งาน (Authorization)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                กรุณายืนยันรหัสผ่านเพื่อสลับสิทธิ์การเข้าถึงข้อมูลระบบ
              </p>
            </div>

            {/* Target User Card */}
            <div className="bg-[#F5F4F7]/80 rounded-2xl p-4 border border-gray-100 mb-5 space-y-1.5">
              <div className="text-xs text-gray-500 font-bold">บัญชีผู้ใช้เป้าหมาย:</div>
              <div className="text-sm font-bold text-gray-950">{targetUser.name}</div>
              <div className="text-xs font-mono text-[#6A5077]">{targetUser.email}</div>
              <div className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#7D57B2]/10 text-[#7D57B2]">
                บทบาท: {targetUser.role}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-gray-500 font-bold mb-1.5">
                  รหัสผ่านประจำตัวผู้ใช้ (Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="ระบุรหัสผ่านของคุณ"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full h-11 pl-3 pr-10 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7D57B2] font-mono"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-100">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Helper tip */}
              <div className="text-[11px] text-gray-400 leading-relaxed font-semibold text-center">
                💡 คำใบ้รหัสผ่าน: ดูรหัสผ่านของผู้ใช้แต่ละคนได้ที่ <span className="text-[#7D57B2]">ระบบ 5 (ผู้ดูแลระบบ)</span> หรือใช้รหัสเริ่มต้น (เช่น admin1234, exec1234, com1234, rec1234)
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="h-11 bg-[#7D57B2] hover:bg-[#6b48a0] text-white text-sm font-semibold rounded-xl shadow transition flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" /> ยืนยันสิทธิ์
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
