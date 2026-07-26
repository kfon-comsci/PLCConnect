import React, { useState } from 'react';
import { UserRole, AppUser } from '../types';
import { Shield, GraduationCap, Sparkles, User, Settings, RefreshCw, LogOut } from 'lucide-react';

interface HeaderProps {
  currentUser: AppUser;
  spreadsheetId: string | null;
  lastSynced: string | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, spreadsheetId, lastSynced, onLogout }) => {
  return (
    <header className="bg-white shadow-md border-b border-[#F5F4F7] sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7D57B2] via-[#E13A9D] to-[#1696CC] flex items-center justify-center text-white shadow-lg shadow-pink-500/10">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-950">
                  PLC <span className="text-[#E13A9D] font-bold">Connect</span>
                </h1>
                <span className="text-xs bg-[#7D57B2]/10 text-[#7D57B2] px-2 py-0.5 rounded-full font-medium">
                  v1.0 (วช.13)
                </span>
                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-emerald-200 transition shrink-0"
                    title={lastSynced ? `ซิงค์ล่าสุดเมื่อ ${lastSynced}` : 'ซิงค์เรียลไทม์'}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    ฐานข้อมูลแผ่นงาน (Google Sheet) ↗
                  </a>
                )}
              </div>
              <p className="text-xs md:text-sm text-[#6A5077] font-medium mt-0.5 leading-relaxed flex flex-wrap items-center gap-2">
                <span>ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี</span>
                <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold bg-[#7D57B2]/10 text-[#7D57B2] rounded-md border border-[#7D57B2]/20">
                  สนับสนุนการพัฒนา โดย กลุ่มบริหารงานวิชาการ
                </span>
              </p>
            </div>
          </div>

          {/* User Settings & Role Selector */}
          <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-pink-50 via-white to-emerald-50 p-2.5 rounded-2xl border border-pink-200/50 shadow-sm self-start md:self-auto">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-pink-200/50">
                <User className="w-4 h-4 text-[#7D57B2]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 leading-none">{currentUser.name}</div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-[#1696CC]" />
                  บทบาท: {
                    currentUser.role === 'Admin' ? 'ผู้ดูแลระบบ (Admin)' :
                    currentUser.role === 'Executive' ? 'ผู้บริหาร (ผอ. / รอง ผอ.)' :
                    currentUser.role === 'Committee' ? `กรรมการระดับชั้น (${currentUser.assignedGrade || 'ม.1'})` :
                    currentUser.role === 'Viewer' ? 'ผู้เยี่ยมชม (Viewer)' :
                    `ผู้บันทึกข้อมูล (${currentUser.assignedClassroom || 'ม.1/1'})`
                  }
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-pink-200/60 mx-1 hidden sm:block"></div>

            {/* Logout Button */}
            <button
              id="header-logout-btn"
              type="button"
              onClick={onLogout}
              className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border border-rose-100 flex items-center gap-1.5 shrink-0 shadow-sm"
              title="ออกจากระบบผู้ใช้ปัจจุบัน"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span id="header-logout-btn-text">ออกจากระบบ</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
