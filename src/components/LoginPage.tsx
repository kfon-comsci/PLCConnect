import React, { useState } from 'react';
import { AppUser } from '../types';
import { GraduationCap, Shield, User, Lock, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  usersList: AppUser[];
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ usersList, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }

    const matched = usersList.find(u => {
      const emailLower = u.email.toLowerCase();
      const emailPrefix = u.email.split('@')[0].toLowerCase();
      const nameLower = u.name.toLowerCase();
      const inputLower = username.trim().toLowerCase();
      return emailLower === inputLower || emailPrefix === inputLower || nameLower.includes(inputLower);
    });

    if (matched) {
      if ((matched.password || '') === password.trim()) {
        setErrorMsg('');
        onLoginSuccess(matched);
      } else {
        setErrorMsg('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
      }
    } else {
      setErrorMsg('ไม่พบชื่อผู้ใช้หรืออีเมลนี้ในระบบ');
    }
  };

  const handleGuestLogin = () => {
    const guestUser: AppUser = {
      email: 'guest@bms.ac.th',
      role: 'Viewer',
      name: 'ผู้เยี่ยมชม (Guest)',
      password: ''
    };
    onLoginSuccess(guestUser);
  };

  const fillCredentials = (email: string, pass: string) => {
    setUsername(email);
    setPassword(pass);
    setErrorMsg('');
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#F5F4F7] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-[#E13A9D]/20">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#7D57B2]/10 to-[#E13A9D]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#1696CC]/10 to-[#7D57B2]/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* App Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-[24px] bg-gradient-to-tr from-[#7D57B2] via-[#E13A9D] to-[#1696CC] flex items-center justify-center text-white shadow-xl shadow-pink-500/10">
            <GraduationCap className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-950 flex items-center justify-center gap-1.5">
              PLC <span className="text-[#E13A9D]">Connect</span>
            </h1>
            <p className="text-xs bg-[#7D57B2]/10 text-[#7D57B2] px-3 py-1 rounded-full font-bold w-fit mx-auto">
              ระบบบริหารจัดการนวัตกรรมและกิจกรรม PLC (วช.13)
            </p>
          </div>
          <p className="text-sm text-gray-500 max-w-xs mx-auto font-medium leading-relaxed">
            ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 border border-gray-100/80">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 text-center">เข้าสู่ระบบการทำงาน</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input - Username */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">Username หรือ อีเมล</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username-input"
                  type="text"
                  required
                  placeholder="เช่น kanok.comsci@gmail.com หรือ admin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(''); }}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7D57B2]/30 focus:border-[#7D57B2] transition-all"
                />
              </div>
            </div>

            {/* Input - Password */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="ป้อนรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  className="w-full pl-10 pr-10 py-3 bg-gray-50/50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7D57B2]/30 focus:border-[#7D57B2] transition-all"
                />
                <button
                  id="login-toggle-password-btn"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[#7D57B2] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              className="w-full bg-gradient-to-r from-[#7D57B2] to-[#E13A9D] hover:opacity-95 text-white py-3 px-4 rounded-2xl text-sm font-bold shadow-lg shadow-pink-500/20 transition-all duration-150 flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <span>ลงชื่อเข้าสู่ระบบ</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Guest login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 font-semibold text-gray-400 uppercase tracking-wider">หรือต้องการเยี่ยมชมข้อมูล</span>
            </div>
          </div>

          {/* Guest login Button */}
          <button
            id="login-guest-btn"
            type="button"
            onClick={handleGuestLogin}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-[#7D57B2]/5 text-gray-700 hover:text-[#7D57B2] rounded-2xl text-xs font-extrabold border border-gray-200/80 hover:border-[#7D57B2]/20 transition-all duration-150 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-[#E13A9D] animate-pulse" />
            <span>เข้าสู่ระบบในฐานะผู้เยี่ยมชม (Guest / Viewer)</span>
          </button>
        </div>

        {/* Demo Accounts Panel */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/40 shadow-sm overflow-hidden transition-all duration-300">
          <button
            type="button"
            onClick={() => setShowDemoAccounts(!showDemoAccounts)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left text-xs font-bold text-gray-600 hover:bg-gray-50/50 transition"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7D57B2]" />
              <span>บัญชีทดสอบระบบสำหรับจำลองบทบาทผู้ใช้งาน</span>
            </div>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
              {showDemoAccounts ? 'ซ่อน' : 'แสดง'}
            </span>
          </button>

          {showDemoAccounts && (
            <div className="px-5 pb-5 border-t border-gray-100/60 pt-3 space-y-2.5">
              <p className="text-[11px] text-gray-500 font-medium">
                คลิกเลือกบทบาทที่ต้องการเพื่อกรอกข้อมูลลงในช่องฟอร์มลงชื่อเข้าใช้โดยอัตโนมัติ:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {usersList.map((usr) => (
                  <button
                    key={usr.email}
                    type="button"
                    onClick={() => fillCredentials(usr.email, usr.password || '')}
                    className="p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#E13A9D]/5 hover:border-[#E13A9D]/20 text-left transition flex flex-col justify-between"
                  >
                    <span className="font-bold text-gray-800 text-[11px] truncate">{usr.name}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 font-semibold">
                      บทบาท: <span className="text-[#7D57B2] font-bold">{usr.role}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium mt-1 font-mono">
                      Pass: {usr.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <p className="text-center text-[10px] text-gray-400 font-medium tracking-wide">
          © {new Date().getFullYear()} โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
