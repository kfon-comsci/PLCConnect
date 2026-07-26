import React, { useState, useEffect } from 'react';
import { MasterInnovation, PLCActivity, ClassroomInnovation, AppUser, CompetencyTemplate } from '../types';
import { SignaturePad } from './SignaturePad';
import { FileText, Award, BarChart3, Clock, AlertTriangle, CheckCircle, Eye, Printer, Layers, Heart, TrendingUp, Trash2 } from 'lucide-react';

interface System4ReportsProps {
  currentUser: AppUser;
  masterInnovations: MasterInnovation[];
  plcActivities: PLCActivity[];
  classroomInnovations: ClassroomInnovation[];
  onSaveClassroom?: (record: ClassroomInnovation) => void;
  onDeleteClassroom?: (id: string) => void;
  onSavePLC?: (record: PLCActivity) => void;
  onShowSuccess?: () => void;
}

const formatThaiDate = (dateStr: string): string => {
  if (!dateStr) return 'ยังไม่ได้ระบุ';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yearAD = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    if (!isNaN(yearAD) && !isNaN(month) && !isNaN(day)) {
      const yearBE = yearAD < 2400 ? yearAD + 543 : yearAD;
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const thaiMonth = thaiMonths[month - 1] || parts[1];
      return `${day} ${thaiMonth} ${yearBE}`;
    }
  }
  return dateStr;
};

const formatThaiDateFull = (dateStr: string): string => {
  if (!dateStr) return 'ยังไม่ได้ระบุ';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const yearAD = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    if (!isNaN(yearAD) && !isNaN(month) && !isNaN(day)) {
      const yearBE = yearAD < 2400 ? yearAD + 543 : yearAD;
      const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const thaiMonth = thaiMonths[month - 1] || parts[1];
      return `${day} ${thaiMonth} พ.ศ. ${yearBE}`;
    }
  }
  return dateStr;
};

export const System4Reports: React.FC<System4ReportsProps> = ({
  currentUser,
  masterInnovations,
  plcActivities,
  classroomInnovations,
  onSaveClassroom,
  onDeleteClassroom,
  onSavePLC,
  onShowSuccess
}) => {
  const isAllAccess = ['Admin', 'Executive'].includes(currentUser.role);
  const isCommittee = currentUser.role === 'Committee';
  const isRecorder = currentUser.role === 'Recorder';
  const isExecutive = currentUser.role === 'Executive';
  const canViewAllGrades = isAllAccess || isCommittee;
  
  const userGrade = currentUser.assignedGrade || (currentUser.assignedClassroom ? (currentUser.assignedClassroom.split('/')[0] as any) : 'ม.1');
  const userClassroom = currentUser.assignedClassroom || `${userGrade}/1`;

  // State for sub-tabs in Reports
  const [activeSubTab, setActiveSubTab] = useState<'4.1' | '4.2' | '4.3'>(isRecorder ? '4.1' : '4.3');

  // Tab grade selections
  const [selectedGrade41, setSelectedGrade41] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>(
    isCommittee ? (userGrade as any) : isRecorder ? (userGrade as any) : 'ม.1'
  );
  const [selectedGrade42, setSelectedGrade42] = useState<'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'>(
    isCommittee ? (userGrade as any) : isRecorder ? (userGrade as any) : 'ม.1'
  );

  useEffect(() => {
    if (isRecorder && userGrade) {
      setSelectedGrade41(userGrade as any);
      setSelectedGrade42(userGrade as any);
    }
  }, [currentUser.email, isRecorder, userGrade]);

  // Classroom Detail View Overlay State
  const [viewingClassroom, setViewingClassroom] = useState<ClassroomInnovation | null>(null);
  const [viewingActivity, setViewingActivity] = useState<PLCActivity | null>(null);

  // Signatures for Printing
  const [recorderSig, setRecorderSig] = useState('');
  const [leaderSig, setLeaderSig] = useState('');
  const [presidentSig, setPresidentSig] = useState('');
  const [viceDirectorSig, setViceDirectorSig] = useState('');
  const [directorSig, setDirectorSig] = useState('');

  useEffect(() => {
    if (viewingClassroom) {
      setViceDirectorSig(viewingClassroom.signatures?.viceDirectorSig || '');
      setDirectorSig(viewingClassroom.signatures?.directorSig || '');
    } else if (viewingActivity) {
      setViceDirectorSig(viewingActivity.signatures?.viceDirectorSig || '');
      setDirectorSig(viewingActivity.signatures?.directorSig || '');
    } else {
      setViceDirectorSig('');
      setDirectorSig('');
    }
  }, [viewingClassroom, viewingActivity]);

  // Hover preview state for work image
  const [hoveredWorkImageUrl, setHoveredWorkImageUrl] = useState<string | null>(null);
  const [hoveredWorkImagePos, setHoveredWorkImagePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Filtering data according to RBAC
  const gradesToRender = canViewAllGrades 
    ? ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'] as const
    : [(userClassroom.split('/')[0] || 'ม.1') as any] as const;

  // --- Calculations for Time Tracking 4.2 ---
  const calculatePLCTime = (grade: string) => {
    const levelPlc = plcActivities.filter(p => p.gradeLevel === grade);
    let totalMinutes = 0;
    levelPlc.forEach(p => {
      const h = Number(p.durationHours);
      const m = Number(p.durationMinutes);
      totalMinutes += ((isNaN(h) ? 0 : h) * 60) + (isNaN(m) ? 0 : m);
    });

    const hours = Math.floor(totalMinutes / 60) || 0;
    const minutes = totalMinutes % 60 || 0;
    return {
      count: levelPlc.length,
      hours,
      minutes,
      totalMinutes: totalMinutes || 0
    };
  };

  // --- Calculations for Junior/Senior High Overview 4.3 ---
  const juniorHighGrades = ['ม.1', 'ม.2', 'ม.3'];
  const seniorHighGrades = ['ม.4', 'ม.5', 'ม.6'];

  const getHighschoolSummary = (gradesList: string[]) => {
    const plcList = plcActivities.filter(p => gradesList.includes(p.gradeLevel));
    let totalMinutes = 0;
    plcList.forEach(p => {
      const h = Number(p.durationHours);
      const m = Number(p.durationMinutes);
      totalMinutes += ((isNaN(h) ? 0 : h) * 60) + (isNaN(m) ? 0 : m);
    });
    const hours = Math.floor(totalMinutes / 60) || 0;
    const minutes = totalMinutes % 60 || 0;
    return {
      count: plcList.length,
      hours,
      minutes
    };
  };

  const juniorSum = getHighschoolSummary(juniorHighGrades);
  const seniorSum = getHighschoolSummary(seniorHighGrades);

  // Print helper (simulates elegant browser print view styled as A4 Portrait)
  const handlePrint = (elementId: string) => {
    const printContent = document.getElementById(elementId);
    if (!printContent) return;
    
    // Create new print window
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(windowUrl, uniqueName.toString(), 'left=50,top=50,width=950,height=950');
    if (!printWindow) return;

    // First write the standard html structure
    printWindow.document.write(`
      <html>
        <head>
          <title>PLC Connect - พิมพ์รายงาน (A4)</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        </head>
        <body onload="setTimeout(function() { window.print(); window.close(); }, 800);">
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    // Copy all parent stylesheets (and Tailwind compilations) so styles render perfectly instantly
    const parentStyles = document.querySelectorAll('link[rel="stylesheet"], style');
    parentStyles.forEach(style => {
      printWindow.document.head.appendChild(style.cloneNode(true));
    });

    // Create and append our custom print overrides style tag (last, so it overrides parent styles)
    const customStyle = printWindow.document.createElement('style');
    customStyle.innerHTML = `
      body {
        font-family: 'Noto Sans Thai', 'Inter', 'Microsoft YaHei', 'PingFang SC', sans-serif;
        color: #0f172a;
        margin: 0;
        padding: 0;
        background-color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      .a4-document-container {
        display: block !important;
        gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .a4-sheet {
        width: 210mm !important;
        height: 297mm !important;
        padding: 10mm 12mm !important; /* tight padding for print fit */
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
        background: white !important;
        overflow: hidden !important;
      }
      .a4-sheet:last-child {
        page-break-after: avoid !important;
      }
      .no-print {
        display: none !important;
      }

      /* Custom Print Optimization Rules for Perfect A4 Fits - using pt sizes for printer accuracy */
      .a4-sheet h1 {
        font-size: 13pt !important;
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
        font-weight: 800 !important;
      }
      .a4-sheet h2 {
        font-size: 11pt !important;
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
        font-weight: 700 !important;
      }
      .a4-sheet h3 {
        font-size: 10pt !important;
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
        font-weight: 700 !important;
      }
      .a4-sheet h4 {
        font-size: 9.5pt !important;
        margin-bottom: 2px !important;
        line-height: 1.25 !important;
        font-weight: 700 !important;
      }
      .a4-sheet p, .a4-sheet div, .a4-sheet span, .a4-sheet td, .a4-sheet th {
        font-size: 9.5pt !important;
        line-height: 1.35 !important;
      }
      .a4-sheet .text-xs {
        font-size: 8.5pt !important;
      }
      .a4-sheet .text-sm {
        font-size: 9.5pt !important;
      }
      .a4-sheet .text-base {
        font-size: 10pt !important;
      }
      .a4-sheet .text-lg {
        font-size: 11.5pt !important;
      }

      /* Make grids and layouts extremely tight for printing to prevent overflow */
      .a4-sheet .p-4 {
        padding: 4px 8px !important;
      }
      .a4-sheet .p-5 {
        padding: 6px 10px !important;
      }
      .a4-sheet .p-6 {
        padding: 8px 12px !important;
      }
      .a4-sheet .mb-6 {
        margin-bottom: 4px !important;
      }
      .a4-sheet .mb-8 {
        margin-bottom: 6px !important;
      }
      .a4-sheet .mt-12 {
        margin-top: 10px !important;
      }
      .a4-sheet .gap-4 {
        gap: 4px !important;
      }
      .a4-sheet .gap-6 {
        gap: 6px !important;
      }
      .a4-sheet .gap-8 {
        gap: 8px !important;
      }
      .a4-sheet .space-y-4 > :not([hidden]) ~ :not([hidden]) {
        margin-top: 4px !important;
      }
      .a4-sheet .space-y-5 > :not([hidden]) ~ :not([hidden]) {
        margin-top: 6px !important;
      }
      .a4-sheet .space-y-10 > :not([hidden]) ~ :not([hidden]) {
        margin-top: 8px !important;
      }
      .a4-sheet table {
        width: 100% !important;
        font-size: 8.5pt !important;
        border-collapse: collapse !important;
      }
      .a4-sheet td, .a4-sheet th {
        padding: 3px 5px !important;
        font-size: 8.5pt !important;
        line-height: 1.25 !important;
      }

      /* Custom elements compacting */
      .classroom-basics-stack {
        margin-bottom: 4px !important;
      }
      .classroom-basic-item-box {
        padding: 4px 8px !important;
        border-radius: 8px !important;
        margin-top: 2px !important;
      }
      .activity-procedure-box, .activity-result-box, .activity-suggestion-box {
        padding: 4px 8px !important;
        border-radius: 8px !important;
        margin-top: 2px !important;
      }
      .activity-committees-box {
        padding: 4px 8px !important;
        border-radius: 8px !important;
      }

      /* User Custom Font Control Classes */
      :root {
        --font-title: 20pt;
        --font-heading: 18pt;
        --font-body: 16pt;
        --font-small: 14pt;
        --line-height: 1.5;
      }

      .report-body {
        font-size: var(--font-body) !important;
        line-height: var(--line-height) !important;
      }
      .report-heading {
        font-size: var(--font-heading) !important;
        line-height: var(--line-height) !important;
      }
      .report-title {
        font-size: var(--font-title) !important;
        line-height: var(--line-height) !important;
      }
      .report-small {
        font-size: var(--font-small) !important;
        line-height: var(--line-height) !important;
      }
    `;
    printWindow.document.head.appendChild(customStyle);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* Reports System Sub-navigation (Redesigned with premium cards, icons, larger fonts, and graphics) */}
      <div className="bg-white/70 backdrop-blur-sm rounded-[24px] p-4 border border-gray-100/70 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        
        {/* Tab 1: สรุปผลภาพรวมระดับโรงเรียน (formerly 4.3) */}
        <button
          type="button"
          onClick={() => setActiveSubTab('4.3')}
          className={`group relative overflow-hidden px-6 py-5.5 rounded-[24px] transition-all duration-300 flex items-center gap-4 border-2 text-left min-h-[96px] ${
            activeSubTab === '4.3'
              ? 'bg-gradient-to-br from-[#1696CC] to-[#4DB7E8] border-transparent text-white shadow-lg shadow-[#1696CC]/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-[#6A5077] hover:bg-[#F5F4F7]/60 hover:border-[#1696CC]/20 hover:text-[#1696CC]'
          }`}
        >
          {/* Visual Graphic Element */}
          <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
            activeSubTab === '4.3' ? 'bg-white/20' : 'bg-[#1696CC]/10'
          }`} />
          <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
            activeSubTab === '4.3' ? 'bg-white/60 animate-ping' : 'bg-transparent'
          }`} />

          <div className="flex items-center gap-3.5 overflow-visible z-10 w-full min-w-0">
            <BarChart3 className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[16px] font-black leading-tight break-words">สรุปผลภาพรวมระดับโรงเรียน</span>
              <span className={`text-[12px] font-bold leading-tight mt-1 ${
                activeSubTab === '4.3' ? 'text-white/85' : 'text-[#6A5077]/60'
              }`}>
                สถิตินวัตกรรมและภาพรวมสถานศึกษา
              </span>
            </div>
          </div>
        </button>

        {/* Tab 2: รายงานผลการทำกิจกรรม (formerly 4.2) */}
        <button
          type="button"
          onClick={() => setActiveSubTab('4.2')}
          className={`group relative overflow-hidden px-6 py-5.5 rounded-[24px] transition-all duration-300 flex items-center gap-4 border-2 text-left min-h-[96px] ${
            activeSubTab === '4.2'
              ? 'bg-gradient-to-br from-[#7D57B2] to-[#9979CE] border-transparent text-white shadow-lg shadow-[#7D57B2]/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-[#6A5077] hover:bg-[#F5F4F7]/60 hover:border-[#7D57B2]/20 hover:text-[#7D57B2]'
          }`}
        >
          {/* Visual Graphic Element */}
          <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
            activeSubTab === '4.2' ? 'bg-white/20' : 'bg-[#7D57B2]/10'
          }`} />
          <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
            activeSubTab === '4.2' ? 'bg-white/60 animate-ping' : 'bg-transparent'
          }`} />

          <div className="flex items-center gap-3.5 overflow-visible z-10 w-full min-w-0">
            <Clock className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[16px] font-black leading-tight break-words">รายงานผลการทำกิจกรรม</span>
              <span className={`text-[12px] font-bold leading-tight mt-1 ${
                activeSubTab === '4.2' ? 'text-white/85' : 'text-[#6A5077]/60'
              }`}>
                ชั่วโมงและกิจกรรมแลกเปลี่ยนเรียนรู้ PLC
              </span>
            </div>
          </div>
        </button>

        {/* Tab 3: รายงานผลแยกตามห้องเรียน (formerly 4.1) */}
        <button
          type="button"
          onClick={() => setActiveSubTab('4.1')}
          className={`group relative overflow-hidden px-6 py-5.5 rounded-[24px] transition-all duration-300 flex items-center gap-4 border-2 text-left min-h-[96px] w-full ${
            activeSubTab === '4.1'
              ? 'bg-gradient-to-br from-[#E13A9D] to-[#F172B8] border-transparent text-white shadow-lg shadow-[#E13A9D]/20 scale-[1.02]'
              : 'bg-white border-gray-100 text-[#6A5077] hover:bg-[#F5F4F7]/60 hover:border-[#E13A9D]/20 hover:text-[#E13A9D]'
          }`}
        >
          {/* Visual Graphic Element */}
          <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full transition-transform duration-500 group-hover:scale-125 opacity-30 blur-md pointer-events-none ${
            activeSubTab === '4.1' ? 'bg-white/20' : 'bg-[#E13A9D]/10'
          }`} />
          <div className={`absolute right-4 top-3 w-2.5 h-2.5 rounded-full pointer-events-none ${
            activeSubTab === '4.1' ? 'bg-white/60 animate-ping' : 'bg-transparent'
          }`} />

          <div className="flex items-center gap-3.5 overflow-visible z-10 w-full min-w-0">
            <Award className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-current" />
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[16px] font-black leading-tight break-words">รายงานผลแยกตามห้องเรียน</span>
              <span className={`text-[12px] font-bold leading-tight mt-1 ${
                activeSubTab === '4.1' ? 'text-white/85' : 'text-[#6A5077]/60'
              }`}>
                ผลงานรายห้องเรียน
              </span>
            </div>
          </div>
        </button>

      </div>

      {/* ========================================================= */}
      {/* 4.1 รายงานผลแยกตามห้องเรียน (Classroom Dashboard) */}
      {/* ========================================================= */}
      {activeSubTab === '4.1' && (() => {
        const activeGradePrefix = selectedGrade41;
        const isJuniorHeader = ['ม.1', 'ม.2', 'ม.3'].includes(activeGradePrefix);

        return (
          <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="border-b border-gray-100 pb-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-950 flex items-center gap-2">
                  <Award className={`w-5 h-5 ${isJuniorHeader ? 'text-emerald-600' : 'text-[#E13A9D]'}`} />
                  ระบบจัดแสดงผลงานนวัตกรรมห้องเรียน
                </h3>
                <p className="text-sm text-[#6A5077] mt-0.5 font-medium">แยกแท็บตารางรายงานผลงานนวัตกรรม ม.1 - ม.6</p>
              </div>

              {/* Level selection tabs */}
              <div className="flex flex-wrap gap-1 bg-[#F5F4F7] p-1.5 rounded-2xl">
                {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map((grade) => {
                  const isJuniorTab = ['ม.1', 'ม.2', 'ม.3'].includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => setSelectedGrade41(grade as any)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                        selectedGrade41 === grade
                          ? isJuniorTab
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-[#E13A9D] text-white shadow-sm'
                          : isJuniorTab
                            ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                            : 'text-gray-700 hover:bg-pink-50 hover:text-[#E13A9D]'
                      }`}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table list of classrooms */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={`text-xs uppercase font-bold tracking-wider text-white transition-colors duration-200 ${
                    isJuniorHeader ? 'bg-emerald-600' : 'bg-[#E13A9D]'
                  }`}>
                    <th className="px-6 py-4 rounded-tl-2xl">ห้องเรียน</th>
                    <th className="px-6 py-4">ภาพผลงาน</th>
                    <th className="px-6 py-4">ชื่อผลงานนวัตกรรม</th>
                    <th className="px-6 py-4 text-center">สถานะการรับรอง</th>
                    <th className="px-6 py-4 text-center rounded-tr-2xl">ผลงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {(() => {
                    const currentClassrooms = classroomInnovations.filter(c => 
                      c.classroomName.startsWith(selectedGrade41)
                    );

                    if (currentClassrooms.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                            ยังไม่มีห้องเรียนใดส่งบันทึกนวัตกรรม วช.13 ในระดับชั้น {selectedGrade41}
                          </td>
                        </tr>
                      );
                    }

                    return currentClassrooms.map((room) => {
                      // Match teachers
                      const mRef = masterInnovations.find(m => m.id === room.masterId);
                      const teachers = mRef 
                        ? mRef.committees.filter(c => c.advisoryClass === room.classroomName).map(c => c.name)
                        : [];

                      const gradePrefix = room.classroomName.split('/')[0] || 'ม.1';
                      const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(gradePrefix);

                      return (
                        <tr 
                          key={room.id} 
                          className={`transition border-b border-gray-100 ${
                            isJunior 
                              ? 'bg-emerald-50/10 hover:bg-emerald-50/40' 
                              : 'bg-pink-50/10 hover:bg-pink-50/40'
                          }`}
                        >
                          <td className="px-6 py-4 font-bold text-gray-950 font-mono text-base">{room.classroomName}</td>
                          <td className="px-6 py-4">
                            {room.files.workImage?.url ? (
                              <div 
                                className={`w-16 h-11 rounded-lg overflow-hidden border shadow-sm cursor-zoom-in transition-all duration-200 hover:scale-[1.05] ${
                                  isJunior ? 'border-emerald-200 hover:border-emerald-400' : 'border-pink-200 hover:border-pink-400'
                                }`}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredWorkImageUrl(room.files.workImage!.url!);
                                  setHoveredWorkImagePos({
                                    x: rect.right + 16,
                                    y: Math.max(16, rect.top - 100)
                                  });
                                }}
                                onMouseMove={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredWorkImagePos({
                                    x: rect.right + 16,
                                    y: Math.max(16, rect.top - 100)
                                  });
                                }}
                                onMouseLeave={() => {
                                  setHoveredWorkImageUrl(null);
                                }}
                              >
                                <img src={room.files.workImage.url} alt="Work" className="w-full h-full object-contain bg-slate-100" />
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">ไม่มีภาพ</span>
                            )}
                          </td>
                          <td className="px-6 py-4 max-w-[380px]">
                            <div className="font-bold text-gray-950 text-sm leading-snug">{room.innovationName}</div>
                            {room.briefDetails && (
                              <div className="text-xs text-[#6A5077] font-medium mt-1 line-clamp-2 leading-relaxed" title={room.briefDetails}>
                                {room.briefDetails}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {(() => {
                              const hasVice = !!room.signatures?.viceDirectorSig;
                              const hasDir = !!room.signatures?.directorSig;
                              const isApproved = hasVice && hasDir;
                              const isPartial = (hasVice || hasDir) && !isApproved;

                              if (isApproved) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    รับรองแล้ว
                                  </span>
                                );
                              } else if (isPartial) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-sm" title={hasVice ? "รองผู้อำนวยการลงนามแล้ว" : "ผู้อำนวยการลงนามแล้ว"}>
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    รอการรับรอง (1/2)
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    รอการรับรอง
                                  </span>
                                );
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingClassroom(room)}
                                className={`h-9 px-4 text-xs font-bold rounded-xl transition flex items-center gap-1 border shadow-sm text-white ${
                                  isJunior
                                    ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-700'
                                    : 'bg-pink-700 hover:bg-pink-800 border-pink-700'
                                }`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                กดดูผลงาน
                              </button>
                              {!isRecorder && !isCommittee && !isExecutive && onDeleteClassroom && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนวัตกรรมของห้องเรียน ${room.classroomName}?`)) {
                                      onDeleteClassroom(room.id);
                                    }
                                  }}
                                  className="h-9 w-9 flex items-center justify-center text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition border border-rose-100 shadow-sm shrink-0"
                                  title="ลบผลงานนี้ออกจากตาราง"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* 4.2 รายงานผลแยกตามระดับชั้น (Time Tracking Summary) */}
      {/* ========================================================= */}
      {activeSubTab === '4.2' && (
        <div className="space-y-6">
          
          {/* Level selection tabs 4.2 */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-950 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#7D57B2]" />
                ระบบประเมินผลชั่วโมง PLC รายระดับชั้น (Time Tracking)
              </h3>
              <p className="text-sm text-[#6A5077] mt-0.5 font-medium">คำนวณและสรุปจำนวนครั้ง ชั่วโมง นาที ใน 1 ภาคเรียน</p>
            </div>

            <div className="flex flex-wrap gap-1 bg-[#F5F4F7] p-1.5 rounded-2xl">
              {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map((grade) => {
                const isAllowed = canViewAllGrades;
                return (
                  <button
                    key={grade}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => setSelectedGrade42(grade as any)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                      selectedGrade42 === grade
                        ? ['ม.1', 'ม.2', 'ม.3'].includes(grade)
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#E13A9D] text-white shadow-sm'
                        : isAllowed
                          ? ['ม.1', 'ม.2', 'ม.3'].includes(grade)
                            ? 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                            : 'text-gray-700 hover:bg-pink-50 hover:text-[#E13A9D]'
                          : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {grade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Tracking statistics box */}
          {(() => {
            const timeData = calculatePLCTime(selectedGrade42);
            const isCompleted = timeData.hours >= 20;
            const remainingMinutes = (20 * 60) - timeData.totalMinutes;
            const remHours = Math.floor(remainingMinutes / 60);
            const remMin = remainingMinutes % 60;

            // Render Level Colored Card Theme
            const levelColors: Record<string, string> = {
              'ม.1': 'from-rose-500/10 to-[#E13A9D]/10 text-rose-700 border-rose-200',
              'ม.2': 'from-orange-500/10 to-[#7D57B2]/10 text-orange-700 border-orange-200',
              'ม.3': 'from-amber-500/10 to-[#1696CC]/10 text-amber-700 border-amber-200',
              'ม.4': 'from-emerald-500/10 to-[#7D57B2]/10 text-emerald-700 border-emerald-200',
              'ม.5': 'from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200',
              'ม.6': 'from-purple-500/10 to-pink-500/10 text-purple-700 border-purple-200'
            };

            return (
              <div className="w-full">
                
                {/* Time Metrics Card */}
                <div className={`w-full bg-gradient-to-tr ${levelColors[selectedGrade42]} rounded-[24px] p-6 md:p-8 border shadow-sm flex flex-col justify-between`}>
                  <div>
                    <span className="text-xs uppercase font-bold tracking-wider mb-2 block">บทวิเคราะห์ชั่วโมงกิจกรรมสายชั้น {selectedGrade42}</span>
                    <h4 className="text-3xl font-bold tracking-tight">
                      รวมสะสม: <span className="text-gray-950">{timeData.hours}</span> ชั่วโมง <span className="text-gray-950">{timeData.minutes}</span> นาที
                    </h4>
                    <p className="text-sm mt-2 font-medium opacity-90">
                      จากการทำกลุ่มกิจกรรมชุมชนแห่งการเรียนรู้ (PLC) ย่อยทั้งหมด {timeData.count} ครั้ง ประจำภาคเรียนปัจจุบัน
                    </p>
                  </div>

                  {/* Warning System UI (RED notification if less than 20 hours) */}
                  {!isCompleted ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-6 flex gap-3 items-start animate-pulse">
                      <AlertTriangle className="w-5.5 h-5.5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-red-800 font-bold text-sm block">🚫 จำนวนชั่วโมงรวมของระดับชั้น/ห้อง "ยังไม่ครบ 20 ชั่วโมง"</span>
                        <span className="text-xs text-red-700 font-medium mt-1 block">
                          ขาดอีกประมาณ <strong className="text-red-900 font-bold">{remHours} ชั่วโมง {remMin} นาที</strong> จึงจะผ่านเกณฑ์เกียรติบัตร วช.13 สมบูรณ์
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 flex gap-3 items-start">
                      <CheckCircle className="w-5.5 h-5.5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-emerald-800 font-bold text-sm block">✅ ผ่านการประเมินกิจกรรม PLC สมบูรณ์</span>
                        <span className="text-xs text-emerald-700 font-medium mt-1 block">
                          ระดับชั้นนี้มีชั่วโมงสะสมครบตามเกณฑ์ขั้นต่ำ 20 ชั่วโมงเรียบร้อยแล้ว
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

          {/* Table List of Level Specific PLC Activities with Single Activity Print button */}
          <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-lg font-bold text-gray-950">รายงานบันทึกกิจกรรมย่อย วช.13 ของสายชั้น {selectedGrade42}</h4>
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className={`text-white uppercase font-bold tracking-wider text-xs ${
                    ['ม.1', 'ม.2', 'ม.3'].includes(selectedGrade42) ? 'bg-emerald-600' : 'bg-[#E13A9D]'
                  }`}>
                    <th className="px-6 py-4 rounded-tl-2xl">รายละเอียดกิจกรรม PLC</th>
                    <th className="px-6 py-4 text-center">สถานะการรับรอง</th>
                    <th className="px-6 py-4 text-center rounded-tr-2xl">การดำเนินงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(() => {
                    const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(selectedGrade42);
                    const isApproved = (p: PLCActivity) => {
                      return !!(p.signatures?.viceDirectorSig && p.signatures?.directorSig);
                    };

                    const sortedActivities = [...plcActivities]
                      .filter(p => p.gradeLevel === selectedGrade42)
                      .sort((a, b) => {
                        const aApp = isApproved(a) ? 1 : 0;
                        const bApp = isApproved(b) ? 1 : 0;
                        return bApp - aApp;
                      });

                    if (sortedActivities.length === 0) {
                      return (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium">
                            ไม่มีกิจกรรม PLC ในสายชั้นนี้
                          </td>
                        </tr>
                      );
                    }

                    return sortedActivities.map((p) => {
                      const approved = isApproved(p);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 text-left">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isJunior ? 'text-emerald-700' : 'text-[#E13A9D]'}`}>
                                ครั้งที่ {p.times}
                              </span>
                              <span className="bg-[#7D57B2]/10 text-[#7D57B2] font-bold text-[10px] px-2 py-0.5 rounded-full">
                                {p.durationHours} ชม. {p.durationMinutes} น.
                              </span>
                            </div>
                            <div className="font-semibold text-gray-950 mt-1">{p.groupName}</div>
                            <div className="text-xs text-gray-400 mt-1 font-medium">
                              วันที่จัดกิจกรรม: {formatThaiDate(p.date)} | ผู้นำกิจกรรม: {p.plcLeader}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                              approved 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${approved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                              {approved ? 'อนุมัติ' : 'รอการอนุมัติ'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => setViewingActivity(p)}
                              className={`inline-flex items-center gap-1.5 h-9 px-4 font-bold text-xs rounded-xl shadow-sm transition text-white ${
                                isJunior 
                                  ? 'bg-emerald-600 hover:bg-emerald-700' 
                                  : 'bg-pink-600 hover:bg-pink-700'
                              }`}
                            >
                              <Printer className="w-4 h-4 text-white" /> ดูรายงานเพื่อพิมพ์ (A4)
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4.3 สรุปผลภาพรวมระดับโรงเรียน (School Overview Dashboard) */}
      {/* ========================================================= */}
      {activeSubTab === '4.3' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Junior High (ม.ต้น) summary */}
            <div className="bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-[24px] p-6 md:p-8 shadow-md relative overflow-hidden border border-emerald-500/20">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-white text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">มัธยมศึกษาตอนต้น</span>
                  <h4 className="text-2xl font-bold text-white mt-2">ระดับชั้น ม.1 - ม.3</h4>
                </div>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-white/80 block font-semibold mb-1">กิจกรรม PLC รวม</span>
                  <span className="text-2xl font-bold text-white font-mono">{juniorSum.count} <span className="text-xs font-medium text-white/70">ครั้ง</span></span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-white/80 block font-semibold mb-1">ชั่วโมงสะสมรวม</span>
                  <span className="text-2xl font-bold text-white font-mono">{juniorSum.hours} <span className="text-xs font-medium text-white/70">ชม. {juniorSum.minutes} น.</span></span>
                </div>
              </div>

              <span className="text-[11px] text-white/90 font-semibold bg-white/15 p-2.5 rounded-xl block mt-6 text-center">
                โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี (สายมัธยมศึกษาตอนต้น)
              </span>
            </div>

            {/* Senior High (ม.ปลาย) summary */}
            <div className="rounded-[24px] p-6 md:p-8 text-white relative overflow-hidden border border-[#E13A9D]/20 shadow-md" style={{ backgroundColor: '#e13a9d' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-white text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">มัธยมศึกษาตอนปลาย</span>
                  <h4 className="text-2xl font-bold text-white mt-2">ระดับชั้น ม.4 - ม.6</h4>
                </div>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-white/80 block font-semibold mb-1">กิจกรรม PLC รวม</span>
                  <span className="text-2xl font-bold text-white font-mono">{seniorSum.count} <span className="text-xs font-medium text-white/70">ครั้ง</span></span>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
                  <span className="text-xs text-white/80 block font-semibold mb-1">ชั่วโมงสะสมรวม</span>
                  <span className="text-2xl font-bold text-white font-mono">{seniorSum.hours} <span className="text-xs font-medium text-white/70">ชม. {seniorSum.minutes} น.</span></span>
                </div>
              </div>

              <span className="text-[11px] text-white/90 font-semibold bg-white/15 p-2.5 rounded-xl block mt-6 text-center">
                โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี (สายมัธยมศึกษาตอนปลาย)
              </span>
            </div>

          </div>

          {/* แผนภูมิเปรียบเทียบชั่วโมงการทำงานรายสายชั้น */}
          <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <h4 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#E13A9D]" />
                  แผนภูมิเปรียบเทียบชั่วโมงกิจกรรม วช.13 รายระดับชั้น (ม.1 - ม.6)
                </h4>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  แสดงการเปรียบเทียบผลรวมเวลาดำเนินกิจกรรมสะสมเพื่อประเมินความพร้อมผ่านเกณฑ์ขั้นต่ำ 20 ชั่วโมง
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E13A9D]" /> ม.1
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#7D57B2]" /> ม.2
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1696CC]" /> ม.3
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> ม.4
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> ม.5
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> ม.6
                </span>
              </div>
            </div>

            {/* Custom Interactive responsive Bar Chart with Y-axis, Grid lines, Benchmarks & Text overlay */}
            <div className="relative pt-12 pb-6 px-2 md:px-6 bg-[#F5F4F7]/40 rounded-2xl border border-gray-100">
              <div className="flex h-72 relative items-end">
                
                {/* Gridlines */}
                {[0, 5, 10, 15, 20, 25].map((val) => {
                  const maxHours = Math.max(...['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(g => {
                    const time = calculatePLCTime(g);
                    return time.hours + (time.minutes / 60);
                  }), 25);
                  const bottomPct = (val / maxHours) * 100;
                  const isBenchmark = val === 20;

                  return (
                    <div 
                      key={val} 
                      className={`absolute left-0 right-0 border-t ${
                        isBenchmark ? 'border-rose-500 border-dashed border-2 z-10 animate-pulse' : 'border-gray-200/50 z-0'
                      }`}
                      style={{ bottom: `${bottomPct}%` }}
                    >
                      {isBenchmark ? (
                        <div className="absolute -top-3.5 right-2 bg-rose-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-20">
                          <Clock className="w-3 h-3 animate-spin-slow" />
                          เส้นระดับเกณฑ์เป้าหมายสะสม: 20 ชั่วโมง ⏱️
                        </div>
                      ) : (
                        <span className="absolute left-1 -top-2.5 text-[9px] font-bold text-gray-400">
                          {val} ชม.
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Bars Area */}
                <div className="w-full h-full flex items-end justify-around relative pl-8 z-10">
                  {['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map((g, idx) => {
                    const time = calculatePLCTime(g);
                    const totalHours = time.hours + (time.minutes / 60);
                    const maxHours = Math.max(...['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'].map(gr => {
                      const t = calculatePLCTime(gr);
                      return t.hours + (t.minutes / 60);
                    }), 25);
                    
                    const barHeightPct = (totalHours / maxHours) * 100;
                    const colors = ['#E13A9D', '#7D57B2', '#1696CC', '#3B82F6', '#10B981', '#F59E0B'];
                    const barColor = colors[idx];
                    const hasPassed = totalHours >= 20;

                    return (
                      <div key={g} className="flex flex-col items-center w-1/8 sm:w-1/10 group relative h-full justify-end">
                        
                        {/* Hover Information / Text Overlay */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30 flex flex-col items-center gap-0.5 whitespace-nowrap">
                          <span>ระดับชั้น {g}</span>
                          <span className="text-pink-400">{time.count} กิจกรรม</span>
                        </div>

                        {/* Exact hours & minutes text overlay (As requested: บอกบนแท่งกราฟว่ากี่ชั่วโมงกี่นาที) */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] font-black text-gray-900 bg-white px-2 py-0.5 rounded-full shadow border border-gray-100 transition-all duration-300 group-hover:scale-110 flex items-center gap-0.5 whitespace-nowrap z-20">
                          <span className="text-gray-950 font-mono">{time.hours} ชม.</span>
                          <span className="text-gray-500 font-mono">{time.minutes} น.</span>
                        </div>

                        {/* Animated Visual Bar */}
                        <div 
                          className="w-full rounded-t-xl transition-all duration-500 hover:brightness-110 shadow-sm group-hover:shadow-md flex flex-col justify-end overflow-hidden pb-2"
                          style={{ 
                            height: `${Math.max(barHeightPct, 4)}%`, 
                            backgroundColor: barColor,
                          }}
                        >
                          {/* Inner bar percentage pattern on hover */}
                          <div className="w-full h-1/2 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300" />
                          
                          {/* Checkmark badge inside the bar if passed */}
                          {hasPassed && (
                            <div className="mx-auto bg-white/20 p-1 rounded-full mb-1 border border-white/20">
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                        </div>

                        {/* Label */}
                        <div className="absolute -bottom-7 text-center">
                          <span className="text-xs font-black text-gray-800 block">{g}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
              <div className="h-4" /> {/* spacing bottom labels */}
            </div>

            {/* Bottom Insight Row */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 leading-relaxed font-medium">
                <span className="font-bold text-amber-950 block text-sm mb-0.5">💡 การวิเคราะห์ผลการสะสมเวลาดำเนินงาน:</span>
                ตามเกณฑ์นวัตกรรมสายชั้นและคู่มือการรายงานกิจกรรม วช.13 คุณครูแต่ละสายชั้นจำเป็นต้องจัดเก็บกิจกรรมชุมชนแห่งการเรียนรู้วิชาชีพ (PLC) สะสมรวมไม่น้อยกว่า <strong className="text-amber-950 underline">20 ชั่วโมงทำงาน</strong> เพื่อขอรับการประเมินและประทับตรายางรับรองผลในสายวิชาการโรงเรียน
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* CLASSROOM WORK VIEW DETAIL OVERLAY (วช.13 Classroom Document) */}
      {/* ========================================================= */}
      {viewingClassroom && (() => {
        const modalMaster = masterInnovations.find(m => m.id === viewingClassroom.masterId || m.gradeLevel === (viewingClassroom.classroomName.split('/')[0]));
        const canEditClassroom = isAllAccess || (isRecorder && userClassroom === viewingClassroom.classroomName);
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-[24px] max-w-5xl w-full max-h-[95vh] relative shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
              
              {/* Elegant Dark Header Bar matching the image */}
              <div className="bg-[#1e293b] text-white p-5 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-800 shrink-0">
                <div>
                  <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7D57B2] animate-pulse" />
                    เอกสารรายงานนวัตกรรมห้องเรียน {viewingClassroom.classroomName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    ขนาดมาตรฐาน A4 แนวตั้ง (ตรวจสอบความเรียบร้อยก่อนพิมพ์)
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrint('classroom-a4-document')}
                    className="h-10 px-5 bg-[#7D57B2] hover:bg-[#6b48a0] text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> พิมพ์รายงาน (Print / Save PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingClassroom(null)}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition active:scale-95"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>

              {/* Scrollable Document Area with slate gray container background to contrast the A4 Sheets */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8">
                
                <div id="classroom-a4-document" className="select-none a4-document-container">
                  
                  {/* Embedded styles block */}
                  <style>{`
                    :root {
                      --font-title: 22pt;
                      --font-heading: 20pt;
                      --font-body: 18pt;
                      --font-small: 16pt;
                      --line-height: 1.5;
                    }

                    .a4-sheet p, 
                    .a4-sheet td, 
                    .a4-sheet span, 
                    .a4-sheet div {
                      color: #000000 !important;
                    }

                    .a4-sheet .text-xs { font-size: 14px !important; }
                    .a4-sheet .text-sm { font-size: 16px !important; }
                    .a4-sheet .text-base { font-size: 18px !important; }
                    .a4-sheet .text-[9px] { font-size: 11px !important; }
                    .a4-sheet .text-[10px] { font-size: 12px !important; }
                    .a4-sheet .text-[11px] { font-size: 13px !important; }
                    .a4-sheet .text-[12px] { font-size: 14px !important; }

                    .a4-sheet .text-white,
                    .a4-sheet .text-white * {
                      color: #ffffff !important;
                    }

                    @media screen {
                      .a4-document-container {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                      }
                      .a4-sheet {
                        background: white;
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm 15mm;
                        margin: 0 auto;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        box-sizing: border-box;
                      }
                      .report-body {
                        font-size: var(--font-body) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-heading {
                        font-size: var(--font-heading) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-title {
                        font-size: var(--font-title) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-small {
                        font-size: var(--font-small) !important;
                        line-height: var(--line-height) !important;
                      }
                    }
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 0;
                      }
                      body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                      }
                      .a4-document-container {
                        display: block !important;
                        gap: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                      .a4-sheet {
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 10mm 12mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        page-break-after: always !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .a4-sheet:last-child {
                        page-break-after: avoid !important;
                      }
                      .report-body {
                        font-size: var(--font-body) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-heading {
                        font-size: var(--font-heading) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-title {
                        font-size: var(--font-title) !important;
                        line-height: var(--line-height) !important;
                      }
                      .report-small {
                        font-size: var(--font-small) !important;
                        line-height: var(--line-height) !important;
                      }
                    }
                  `}</style>

                  {/* ==================== PAGE 1 ==================== */}
                  <div className="a4-sheet text-slate-900">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title block */}
                        <div className="text-center pb-3 mb-5 p-4 rounded-2xl bg-gradient-to-r from-pink-100/40 to-emerald-100/40 border border-pink-200/40 shadow-sm">
                          <h1 className="text-base md:text-lg font-black text-black leading-relaxed tracking-tight">
                            ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน
                          </h1>
                          <h2 className="text-sm md:text-base font-bold text-black mt-0.5">
                            โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี
                          </h2>
                          <div className="font-extrabold text-[13.5pt] text-[#7D57B2] mt-2 border-t border-dashed border-pink-200/40 pt-1 leading-tight">
                            ธีมนวัตกรรมสายชั้น: {modalMaster?.theme || 'ยังไม่กำหนดธีม'}
                          </div>
                        </div>

                        {/* 2-Column layout: Col 1 is work image, Col 2 contains Innovation Name, Classroom, Advisor/Reporter */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6 p-5 rounded-2xl border border-gray-200/60 bg-gradient-to-r from-[#E8F5E9]/30 to-[#FCE4EC]/30 text-left">
                          {/* Col 1: ภาพนวัตกรรม */}
                          <div className="md:col-span-5 h-44 rounded-xl overflow-hidden border border-gray-200 bg-slate-50 flex items-center justify-center shrink-0 shadow-sm">
                            {viewingClassroom.files.workImage?.url ? (
                              <img 
                                src={viewingClassroom.files.workImage.url} 
                                alt="ภาพผลงานนวัตกรรม" 
                                className="w-full h-full object-cover bg-slate-50" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="text-center p-3">
                                <span className="text-3xl block mb-2">📷</span>
                                <span className="text-[11px] text-gray-400 font-bold block">ยังไม่อัปโหลดภาพผลงาน</span>
                              </div>
                            )}
                          </div>
                          {/* Col 2: ชื่อผลงานนวัตกรรม, ห้องเรียน, ภาคเรียน/ปีการศึกษา, ครูที่ปรึกษา */}
                          <div className="md:col-span-7 flex flex-col justify-between py-1 space-y-3.5">
                            <div>
                              <span className="text-[11px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">ชื่อผลงานนวัตกรรม:</span>
                              <span className="text-base font-black text-[#7D57B2] block leading-tight">
                                {viewingClassroom.innovationName || 'ยังไม่ระบุชื่อผลงาน'}
                              </span>
                            </div>
                            <div className="border-t border-gray-150/50 pt-2.5 space-y-2.5">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">ห้องเรียน:</span>
                                  <span className="text-sm font-extrabold text-slate-800 block">
                                    {viewingClassroom.classroomName}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">ภาคเรียน/ปีการศึกษา:</span>
                                  <span className="text-sm font-extrabold text-slate-800 block">
                                    {modalMaster ? `ภาคเรียนที่ ${modalMaster.semester}/${modalMaster.academicYear}` : '—'}
                                  </span>
                                </div>
                              </div>
                              <div className="border-t border-gray-100/50 pt-2">
                                <span className="text-[11px] text-gray-400 font-bold block mb-0.5">ครูที่ปรึกษา / ผู้จัดทำ:</span>
                                <span className="text-sm font-extrabold text-gray-800 block">
                                  {viewingClassroom.reporterName || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Classroom Basics Stacked on Separate Lines */}
                        <div className="space-y-4 mb-6 text-left classroom-basics-stack">
                          <div>
                            <span className="info-label text-xs font-bold text-black block mb-1.5 bg-gradient-to-r from-pink-100 to-emerald-100 px-3 py-1.5 rounded-xl border border-pink-200/20">รายละเอียดนวัตกรรมโดยย่อ:</span>
                            <p className="text-xs text-black leading-relaxed whitespace-pre-line bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 classroom-basic-item-box font-medium">
                              {viewingClassroom.briefDetails || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="info-label text-xs font-bold text-black block mb-1.5 bg-gradient-to-r from-pink-100 to-emerald-100 px-3 py-1.5 rounded-xl border border-pink-200/20">จุดประสงค์นวัตกรรม:</span>
                            <p className="text-xs text-black leading-relaxed whitespace-pre-line bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 classroom-basic-item-box font-medium">
                              {viewingClassroom.goals || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="info-label text-xs font-bold text-black block mb-1.5 bg-gradient-to-r from-pink-100 to-emerald-100 px-3 py-1.5 rounded-xl border border-pink-200/20">ประโยชน์ที่คาดว่าจะได้รับ:</span>
                            <p className="text-xs text-black leading-relaxed whitespace-pre-line bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 classroom-basic-item-box font-medium">
                              {viewingClassroom.expectedBenefits || '—'}
                            </p>
                          </div>
                        </div>

                        {/* Committees */}
                        <div className="mb-6 text-left">
                          <span className="info-label text-xs block mb-2 font-bold text-black bg-gradient-to-r from-pink-100 to-emerald-100 px-3 py-1.5 rounded-xl border border-pink-200/20">รายชื่อสภานวัตกรคณะกรรมการห้องเรียน:</span>
                          <div className="grid grid-cols-5 gap-2.5">
                            <div className="bg-gray-50/80 p-2 rounded-xl text-center border border-gray-100/50 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-bold block">ประธานห้อง</span>
                              <span className="text-[10px] font-bold text-black block mt-0.5 truncate">{viewingClassroom.committees?.president || '—'}</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-xl text-center border border-gray-100/50 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-bold block">รองประธาน</span>
                              <span className="text-[10px] font-bold text-black block mt-0.5 truncate">{viewingClassroom.committees?.vicePresident || '—'}</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-xl text-center border border-gray-100/50 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-bold block">เลขานุการ</span>
                              <span className="text-[10px] font-bold text-black block mt-0.5 truncate">{viewingClassroom.committees?.secretary || '—'}</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-xl text-center border border-gray-100/50 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-bold block">ประชาสัมพันธ์</span>
                              <span className="text-[10px] font-bold text-black block mt-0.5 truncate">{viewingClassroom.committees?.publicRelations || '—'}</span>
                            </div>
                            <div className="bg-gray-50/80 p-2 rounded-xl text-center border border-gray-100/50 shadow-sm">
                              <span className="text-[9px] text-gray-400 font-bold block">เหรัญญิก</span>
                              <span className="text-[10px] font-bold text-black block mt-0.5 truncate">{viewingClassroom.committees?.treasurer || '—'}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Page 1 Footer */}
                    <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 shrink-0">
                      <span>แบบบันทึกนวัตกรรมห้องเรียน</span>
                      <span>หน้า 1 / 2</span>
                    </div>
                  </div>

                  {/* ==================== PAGE 2 ==================== */}
                  <div className="a4-sheet text-slate-900">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title block */}
                        <div className="text-center pb-3 mb-5 p-4 rounded-2xl bg-gradient-to-r from-pink-100/40 to-emerald-100/40 border border-pink-200/40 shadow-sm">
                          <h1 className="text-base md:text-lg font-black text-black leading-relaxed tracking-tight">
                            ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน
                          </h1>
                          <h2 className="text-sm md:text-base font-bold text-black mt-0.5">
                            โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี
                          </h2>
                          <div className="font-extrabold text-[13.5pt] text-[#7D57B2] mt-2 border-t border-dashed border-pink-200/40 pt-1 leading-tight">
                            ธีมนวัตกรรมสายชั้น: {modalMaster?.theme || 'ยังไม่กำหนดธีม'}
                          </div>
                        </div>

                        {/* Section subtitle */}
                        <div className="text-center mb-4">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider bg-slate-100/50 py-1 rounded-lg">
                            สมรรถนะการเรียนรู้และลายมือชื่อผู้จัดทำเอกสาร
                          </h3>
                        </div>

                        {/* Competencies 11 fields */}
                        <div className="mb-6 text-left">
                          <span className="info-label text-xs block mb-2 font-bold text-black bg-gradient-to-r from-pink-100 to-emerald-100 px-3 py-1.5 rounded-xl border border-pink-200/20">ฐานสมรรถนะกลุ่มสาระการเรียนรู้:</span>
                          
                          {(() => {
                            const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(viewingClassroom.classroomName.split('/')[0]);
                            const headerBg = isJunior ? 'bg-emerald-50' : 'bg-pink-50';
                            const headerText = isJunior ? 'text-emerald-800' : 'text-pink-800';
                            const borderClass = isJunior ? 'border-emerald-200' : 'border-pink-200';
                            const rowLabelBg = isJunior ? 'bg-emerald-50/20' : 'bg-pink-50/20';

                            return (
                              <table className={`w-full border-collapse border ${borderClass} mt-1`}>
                                <thead>
                                  <tr className={headerBg}>
                                    <th className={`border ${borderClass} px-3 py-1.5 text-left text-[11px] font-black ${headerText} uppercase tracking-wider`} style={{ width: '30%' }}>กลุ่มสาระฯ / ด้านสมรรถนะ</th>
                                    <th className={`border ${borderClass} px-3 py-1.5 text-left text-[11px] font-black ${headerText} uppercase tracking-wider`}>รายละเอียดที่ห้องเรียนดำเนินงานจริง</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150">
                                  {[
                                    { key: 'thai', label: 'ภาษาไทย' },
                                    { key: 'math', label: 'คณิตศาสตร์' },
                                    { key: 'science', label: 'วิทยาศาสตร์และเทคโนโลยี' },
                                    { key: 'technology', label: 'เทคโนโลยี' },
                                    { key: 'social', label: 'สังคมศึกษา ศาสนา และวัฒนธรรม' },
                                    { key: 'english', label: 'ภาษาต่างประเทศ (อังกฤษ)' },
                                    { key: 'chinese', label: 'ภาษาต่างประเทศ (จีน)' },
                                    { key: 'career', label: 'การงานอาชีพ' },
                                    { key: 'health', label: 'สุขศึกษาและพลศึกษา' },
                                    { key: 'art', label: 'ศิลปะ' },
                                    { key: 'guidance', label: 'กิจกรรมแนะแนว' },
                                  ].map((subj) => {
                                    const value = viewingClassroom.competencies?.[subj.key as keyof CompetencyTemplate] || '—';
                                    return (
                                      <tr key={subj.key} className="hover:bg-slate-50/30">
                                        <td className={`border ${borderClass} px-3 py-1.5 text-[11px] font-bold text-slate-800 ${rowLabelBg} text-left`}>
                                          {subj.label}
                                        </td>
                                        <td className={`border ${borderClass} px-3 py-1.5 text-[11px] text-left text-slate-700 whitespace-pre-line leading-relaxed font-medium`}>
                                          {value}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>

                        {/* Signatures */}
                        <div className="mt-8 pt-4 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-6 text-center">
                            {/* Column 1: ครูผู้จัดทำนวัตกรรม */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-2">ครูผู้จัดทำนวัตกรรม</span>
                              <span className="text-[12px] font-bold text-slate-800">({viewingClassroom.reporterName || '—'})</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ครูประจำชั้น / ครูผู้เสนอรายงาน</span>
                            </div>

                            {/* Column 2: ประธาน PLC */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-2">ประธาน PLC / หัวหน้าสายชั้น</span>
                              <span className="text-[12px] font-bold text-slate-800">({modalMaster?.committees?.find((c: any) => c.role === 'ประธาน' || c.role === 'ผู้นำกลุ่ม')?.name || 'ครูผู้รับรองสายชั้น'})</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ประธานกลุ่มพัฒนาวิชาชีพสายชั้น</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-6 pt-4">
                            {/* Column 1: ผู้รับรองรายงานฝ่ายวิชาการ */}
                            <div className="flex flex-col items-center text-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-1">ผู้รับรองรายงานฝ่ายวิชาการ</span>
                              <div className="h-12 flex items-end justify-center w-40 border-b border-dashed border-slate-300 pb-1 mb-1">
                                {viceDirectorSig ? (
                                  <img src={viceDirectorSig} alt="Academic Sig" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                                ) : null}
                              </div>
                              <span className="text-[9px] text-slate-400 block mb-1">ลงชื่อ......................................................</span>
                              <span className="text-[11px] font-bold text-slate-800">(นางสาวสุวรรณ บัวหลวง)</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">รองผู้อำนวยการกลุ่มบริหารงานวิชาการ</span>
                            </div>

                            {/* Column 2: ผู้รับรองระดับสถานศึกษา */}
                            <div className="flex flex-col items-center text-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-1">ผู้รับรองระดับสถานศึกษา</span>
                              <div className="h-12 flex items-end justify-center w-40 border-b border-dashed border-slate-300 pb-1 mb-1">
                                {directorSig ? (
                                  <img src={directorSig} alt="Director Sig" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                                ) : null}
                              </div>
                              <span className="text-[9px] text-slate-400 block mb-1">ลงชื่อ......................................................</span>
                              <span className="text-[11px] font-bold text-slate-800">(นายประจักษ์ ประมูลศิลป์)</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ผู้อำนวยการโรงเรียนเบญจมานุสรณ์</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Page 2 Footer */}
                    <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 shrink-0">
                      <span>แบบบันทึกนวัตกรรมห้องเรียน (วช.13)</span>
                      <span>หน้า 2 / 2</span>
                    </div>
                  </div>

                </div>

                {/* Digital sign pads before rendering PDF */}
                {!isRecorder && !isCommittee && (
                  <div className="no-print bg-white p-6 rounded-[24px] border border-slate-150 shadow-sm mt-8 max-w-[210mm] mx-auto text-left">
                    <h5 className="font-bold text-sm text-gray-950 mb-4 flex items-center gap-2">
                      <span className="text-[#7D57B2]">✍️</span> ลงนามเอกสารดิจิทัลก่อนพิมพ์ (ลงลายมือชื่ออิเล็กทรอนิกส์)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 mb-2">ลายมือชื่อ รองผู้อำนวยการกลุ่มบริหารงานวิชาการ (นางสาวสุวรรณ บัวหลวง)</label>
                        <SignaturePad
                          onSave={(dataUrl) => {
                            setViceDirectorSig(dataUrl);
                            if (viewingClassroom && onSaveClassroom) {
                              const updated: ClassroomInnovation = {
                                ...viewingClassroom,
                                signatures: {
                                  ...viewingClassroom.signatures,
                                  viceDirectorSig: dataUrl
                                }
                              };
                              setViewingClassroom(updated);
                              onSaveClassroom(updated);
                            }
                          }}
                          onClear={() => {
                            setViceDirectorSig('');
                            if (viewingClassroom && onSaveClassroom) {
                              const updated: ClassroomInnovation = {
                                ...viewingClassroom,
                                signatures: {
                                  ...viewingClassroom.signatures,
                                  viceDirectorSig: undefined
                                }
                              };
                              setViewingClassroom(updated);
                              onSaveClassroom(updated);
                            }
                          }}
                          savedImage={viceDirectorSig}
                        />
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-700 mb-2">ลายมือชื่อ ผู้อำนวยการโรงเรียน (นายประจักษ์ ประมูลศิลป์)</label>
                        <SignaturePad
                          onSave={(dataUrl) => {
                            setDirectorSig(dataUrl);
                            if (viewingClassroom && onSaveClassroom) {
                              const updated: ClassroomInnovation = {
                                ...viewingClassroom,
                                signatures: {
                                  ...viewingClassroom.signatures,
                                  directorSig: dataUrl
                                }
                              };
                              setViewingClassroom(updated);
                              onSaveClassroom(updated);
                            }
                          }}
                          onClear={() => {
                            setDirectorSig('');
                            if (viewingClassroom && onSaveClassroom) {
                              const updated: ClassroomInnovation = {
                                ...viewingClassroom,
                                signatures: {
                                  ...viewingClassroom.signatures,
                                  directorSig: undefined
                                }
                              };
                              setViewingClassroom(updated);
                              onSaveClassroom(updated);
                            }
                          }}
                          savedImage={directorSig}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================= */}
      {/* SINGLE PLC ACTIVITY VIEW DETAIL OVERLAY (A4 Activity Doc) */}
      {/* ========================================================= */}
      {viewingActivity && (() => {
        const presidentName = masterInnovations.find(m => m.gradeLevel === viewingActivity.gradeLevel)?.committees?.find(c => c.role === 'ประธาน' || c.role === 'ประธานกลุ่ม' || c.role === 'ประธานสายชั้น' || c.role === 'ผู้นำกลุ่ม')?.name || 'ครูสมคิด จันทบูรณ์';
        const committees = masterInnovations.find(m => m.gradeLevel === viewingActivity.gradeLevel)?.committees || [];

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 rounded-[24px] max-w-5xl w-full max-h-[95vh] relative shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
              
              {/* Elegant Dark Header Bar matching the image */}
              <div className="bg-[#1e293b] text-white p-5 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-800 shrink-0">
                <div>
                  <h4 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E13A9D] animate-pulse" />
                    เอกสารรายงานผลการดำเนินงานกิจกรรม PLC (วช.13)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    ขนาดมาตรฐาน A4 แนวตั้ง (ตรวจสอบความเรียบร้อยก่อนพิมพ์)
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handlePrint('activity-a4-document')}
                    className="h-10 px-5 bg-[#E13A9D] hover:bg-[#c22d7f] text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 active:scale-95"
                  >
                    <Printer className="w-4 h-4" /> พิมพ์รายงาน (Print / Save PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingActivity(null)}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition active:scale-95"
                  >
                    ปิดหน้าต่าง
                  </button>
                </div>
              </div>

              {/* Scrollable Document Area with slate gray container background to contrast the A4 Sheets */}
              <div className="flex-1 overflow-y-auto bg-slate-100 p-4 md:p-8">
                
                 <div id="activity-a4-document" className="select-none a4-document-container">
                  
                  {/* Embedded styles block */}
                  <style>{`
                    @media screen {
                      .a4-document-container {
                        display: flex;
                        flex-direction: column;
                        gap: 2rem;
                      }
                      .a4-sheet {
                        background: white;
                        width: 210mm;
                        min-height: 297mm;
                        padding: 20mm 15mm;
                        margin: 0 auto;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        border-radius: 16px;
                        border: 1px solid #e2e8f0;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        box-sizing: border-box;
                      }
                      .report-body { font-size: 18px !important; }
                      .report-heading { font-size: 24px !important; }
                      .report-title { font-size: 28px !important; }
                    }
                    @media print {
                      @page {
                        size: A4 portrait;
                        margin: 0;
                      }
                      body {
                        margin: 0;
                        padding: 0;
                        background: white !important;
                      }
                      .a4-document-container {
                        display: block !important;
                        gap: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                      }
                      .a4-sheet {
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 10mm 12mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        page-break-after: always !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        box-sizing: border-box !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .a4-sheet:last-child {
                        page-break-after: avoid !important;
                      }
                      .report-body { font-size: 16pt !important; }
                      .report-heading { font-size: 18pt !important; }
                      .report-title { font-size: 20pt !important; }
                    }

                    /* Increment all font sizes inside PLC document by +1 */
                    #activity-a4-document .a4-sheet h1 { font-size: 14pt !important; }
                    #activity-a4-document .a4-sheet h2 { font-size: 12pt !important; }
                    #activity-a4-document .a4-sheet h3 { font-size: 11pt !important; }
                    #activity-a4-document .a4-sheet h4 { font-size: 10.5pt !important; }
                    #activity-a4-document .a4-sheet p, 
                    #activity-a4-document .a4-sheet div, 
                    #activity-a4-document .a4-sheet span, 
                    #activity-a4-document .a4-sheet td, 
                    #activity-a4-document .a4-sheet th { 
                      font-size: 10.5pt !important; 
                    }
                    #activity-a4-document .a4-sheet .text-xs { font-size: 9.5pt !important; }
                    #activity-a4-document .a4-sheet .text-sm { font-size: 10.5pt !important; }
                    #activity-a4-document .a4-sheet .text-base { font-size: 11pt !important; }
                    #activity-a4-document .a4-sheet .text-lg { font-size: 12.5pt !important; }

                    /* Custom styling for print background blocks */
                    .theme-block-junior {
                      background-color: rgba(16, 185, 129, 0.06) !important;
                      border-color: rgba(16, 185, 129, 0.15) !important;
                    }
                    .theme-block-senior {
                      background-color: rgba(225, 58, 157, 0.06) !important;
                      border-color: rgba(225, 58, 157, 0.15) !important;
                    }
                  `}</style>

                  {/* ==================== PAGE 1 ==================== */}
                  <div className="a4-sheet text-slate-900">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Metadata Integrated Header Block */}
                        {(() => {
                          const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(viewingActivity.gradeLevel);
                          const bgClass = isJunior ? 'bg-[#E8F5E9] text-green-950 border-green-100/60' : 'bg-[#FCE4EC] text-pink-950 border-pink-100/60';
                          return (
                            <div className="mb-5 text-center">
                              <div className="pb-2">
                                <h1 className="text-base md:text-lg font-black text-gray-950 leading-relaxed tracking-tight">
                                  ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน
                                </h1>
                                <h2 className="text-sm md:text-base font-bold text-gray-900 mt-0.5">
                                  โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี
                                </h2>
                              </div>
                              
                              {/* Integrated Header Metadata */}
                              <div className="p-2.5 rounded-2xl border bg-gradient-to-r from-[#E8F5E9] to-[#FCE4EC] border-pink-200/50 text-center space-y-0.5 shadow-sm">
                                <div className="font-extrabold text-[13.5pt] text-slate-800 leading-tight">
                                  ระดับชั้น {viewingActivity.gradeLevel.replace('ม.', 'มัธยมศึกษาปีที่ ')} &nbsp;|&nbsp; ภาคเรียนที่ {viewingActivity.semester} ปีการศึกษา {viewingActivity.academicYear}
                                </div>
                                <div className="font-black text-[13.5pt] border-t border-pink-200/30 pt-0.5 leading-tight">
                                  ธีมนวัตกรรมสายชั้น: {masterInnovations.find(m => m.gradeLevel === viewingActivity.gradeLevel)?.theme || 'ยังไม่กำหนดธีม'}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Left/Right Top Line Section with +1 Font size */}
                        {(() => {
                          const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(viewingActivity.gradeLevel);
                          const accentColor = isJunior ? 'text-emerald-700' : 'text-[#E13A9D]';
                          return (
                            <div className="grid grid-cols-2 gap-4 mb-5 border border-slate-200 rounded-[20px] p-4 bg-slate-50/20 text-[11.5pt] text-left">
                              <div className="space-y-2 border-r border-slate-150 pr-4">
                                <div>
                                  <span className="text-gray-400 font-bold text-[9.5pt] block uppercase tracking-wider">ครั้งที่ดำเนินกิจกรรม</span>
                                  <span className={`text-base font-black ${accentColor}`}>ครั้งที่ {viewingActivity.times}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold text-[9.5pt] block uppercase tracking-wider">วันที่จัดกิจกรรม</span>
                                  <span className="text-slate-800 font-extrabold">{formatThaiDateFull(viewingActivity.date)}</span>
                                </div>
                              </div>
                              <div className="space-y-2 pl-4">
                                <div>
                                  <span className="text-gray-400 font-bold text-[9.5pt] block uppercase tracking-wider">ชื่อกลุ่มกิจกรรม / ชื่อกิจกรรม</span>
                                  <span className="text-slate-800 font-extrabold line-clamp-2 leading-snug">{viewingActivity.groupName}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400 font-bold text-[9.5pt] block uppercase tracking-wider">เวลาที่ใช้ปฏิบัติงาน</span>
                                  <span className="text-slate-800 font-extrabold">{viewingActivity.durationHours} ชั่วโมง {viewingActivity.durationMinutes} นาที</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Main 2-Column section */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 mb-5">
                          {/* Left Column (procedures, results, suggestions) */}
                          {(() => {
                            const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(viewingActivity.gradeLevel);
                            const titleColor = isJunior ? 'text-emerald-800' : 'text-pink-800';
                            const borderTheme = isJunior ? 'border-emerald-500' : 'border-[#E13A9D]';
                            const blockClass = isJunior ? 'theme-block-junior' : 'theme-block-senior';
                            return (
                              <div className="md:col-span-3 space-y-5 text-left">
                                <div>
                                  <h4 className={`flex items-center gap-2 text-xs font-bold ${titleColor} border-l-4 ${borderTheme} pl-2.5 py-0.5 text-[12.5pt]`}>
                                    ขั้นตอนการดำเนินงาน PLC
                                  </h4>
                                  <div className={`mt-1.5 rounded-2xl border p-4 text-[11px] text-slate-700 leading-relaxed whitespace-pre-line ${blockClass}`}>
                                    {viewingActivity.procedures}
                                  </div>
                                </div>

                                <div>
                                  <h4 className={`flex items-center gap-2 text-xs font-bold ${titleColor} border-l-4 ${borderTheme} pl-2.5 py-0.5 text-[12.5pt]`}>
                                    ผลที่ได้จากขั้นตอนการดำเนินงาน
                                  </h4>
                                  <div className={`mt-1.5 rounded-2xl border p-4 text-[11px] text-slate-700 leading-relaxed whitespace-pre-line ${blockClass}`}>
                                    {viewingActivity.results}
                                  </div>
                                </div>

                                {viewingActivity.suggestions && (
                                  <div>
                                    <h4 className={`flex items-center gap-2 text-xs font-bold ${titleColor} border-l-4 ${borderTheme} pl-2.5 py-0.5 text-[12.5pt]`}>
                                      ข้อเสนอแนะเพิ่มเติม
                                    </h4>
                                    <div className={`mt-1.5 rounded-2xl border p-4 text-[11px] text-slate-700 leading-relaxed whitespace-pre-line ${blockClass}`}>
                                      {viewingActivity.suggestions}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Right Column (committees) - Compact / Reduced Line Spacing */}
                          <div className="md:col-span-2 text-left">
                            <h4 className="flex items-center gap-2 text-xs font-bold text-gray-950 border-l-4 border-slate-400 pl-2.5 py-0.5 mb-2 text-[12.5pt]">
                              รายชื่อคณะกรรมการประจำระดับชั้น
                            </h4>
                            <div className="bg-transparent rounded-2xl border border-slate-100 p-3.5 space-y-1.5">
                              {committees.length > 0 ? (
                                committees.map((member, idx) => (
                                  <div key={idx} className="text-[11px] font-semibold text-slate-700 leading-tight">
                                    <div>{idx + 1}. {member.name}</div>
                                    <span className="text-[#E13A9D] text-[9.5pt] font-extrabold block ml-4 mt-0.5">{member.role}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-[11px] text-gray-400 italic block py-4 text-center">ยังไม่ระบุรายชื่อ</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Page 1 Footer */}
                    <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 shrink-0">
                      <span>เอกสารรายงานผลการดำเนินงานกิจกรรม PLC (วช.13)</span>
                      <span>หน้า 1 / 2</span>
                    </div>
                  </div>

                  {/* ==================== PAGE 2 ==================== */}
                  <div className="a4-sheet text-slate-900">
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Metadata Integrated Header Block (Page 2) */}
                        {(() => {
                          const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(viewingActivity.gradeLevel);
                          const bgClass = isJunior ? 'bg-[#E8F5E9] text-green-950 border-green-100/60' : 'bg-[#FCE4EC] text-pink-950 border-pink-100/60';
                          return (
                            <div className="mb-5 text-center">
                              <div className="pb-2">
                                <h1 className="text-base md:text-lg font-black text-gray-950 leading-relaxed tracking-tight">
                                  ชุมชนแห่งการเรียนรู้ครูเพื่อศิษย์แบบบูรณาการ 1 นวัตกรรม 1 ห้องเรียน
                                </h1>
                                <h2 className="text-sm md:text-base font-bold text-gray-900 mt-0.5">
                                  โรงเรียนเบญจมานุสรณ์ จังหวัดจันทบุรี
                                </h2>
                              </div>
                              
                              {/* Integrated Header Metadata */}
                              <div className="p-2.5 rounded-2xl border bg-gradient-to-r from-[#E8F5E9] to-[#FCE4EC] border-pink-200/50 text-center space-y-0.5 shadow-sm">
                                <div className="font-extrabold text-[13.5pt] text-slate-800 leading-tight">
                                  ระดับชั้น {viewingActivity.gradeLevel.replace('ม.', 'มัธยมศึกษาปีที่ ')} &nbsp;|&nbsp; ภาคเรียนที่ {viewingActivity.semester} ปีการศึกษา {viewingActivity.academicYear}
                                </div>
                                <div className="font-black text-[13.5pt] border-t border-pink-200/30 pt-0.5 leading-tight">
                                  ธีมนวัตกรรมสายชั้น: {masterInnovations.find(m => m.gradeLevel === viewingActivity.gradeLevel)?.theme || 'ยังไม่กำหนดธีม'}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Section subtitle */}
                        <div className="text-center mb-4">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            ภาพประกอบกิจกรรมและผู้รับรองรายงานการดำเนินงานกิจกรรม PLC
                          </h3>
                        </div>

                        {/* Evidence images section */}
                        <div className="text-left mb-6">
                          <h4 className="flex items-center gap-2 text-xs font-bold text-gray-900 border-l-4 border-slate-400 pl-2.5 py-0.5 mb-2.5 text-[12.5pt]">
                            ภาพถ่ายประกอบการทำกิจกรรม
                          </h4>
                          <div className="bg-transparent rounded-2xl border border-slate-100 p-4 min-h-[140px] flex items-center justify-center">
                            {viewingActivity.images && viewingActivity.images.length > 0 ? (
                              <div className="grid grid-cols-2 gap-3 w-full max-w-lg mx-auto">
                                {viewingActivity.images.map((img, idx) => (
                                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 h-28 bg-gray-100 shadow-sm flex items-center justify-center p-1">
                                    {img.startsWith('data:') || img.startsWith('http') ? (
                                      <img src={img} alt={`Evidence Print ${idx}`} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="p-3 text-[10px] text-gray-500 font-semibold text-center leading-relaxed">
                                        {img}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center text-slate-400/80 font-bold text-xs flex flex-col items-center gap-2">
                                <span className="text-lg">📷</span>
                                <span>ไม่พบภาพถ่ายประกอบการทำกิจกรรม</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Horizontal divider */}
                        <div className="border-t border-slate-100 my-4" />

                        {/* Signatures structure */}
                        <div className="space-y-6 text-center mt-6">
                          {/* Row 1 - 2 Columns (Names only, no signature or sign lines, leader section removed) */}
                          <div className="grid grid-cols-2 gap-6">
                            {/* Column 1: ผู้รายงาน/ผู้บันทึกข้อมูล */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-2">ผู้รายงาน/ผู้บันทึกข้อมูล</span>
                              <span className="text-[12px] font-bold text-slate-800">({viewingActivity.recorderName || 'ครูผู้รายงาน'})</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ผู้รายงาน/ผู้บันทึกข้อมูล</span>
                            </div>

                            {/* Column 2: ประธาน PLC */}
                            <div className="flex flex-col items-center justify-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-2">ประธาน PLC</span>
                              <span className="text-[12px] font-bold text-slate-800">({presidentName})</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ประธาน PLC</span>
                            </div>
                          </div>

                          {/* Row 2 - Vice Director (Centered on this line) */}
                          <div className="grid grid-cols-1 gap-6 pt-4">
                            <div className="flex flex-col items-center text-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-1">ผู้รับรองรายงานฝ่ายวิชาการ</span>
                              <div className="h-12 flex items-end justify-center w-40 border-b border-dashed border-slate-300 pb-1 mb-1">
                                {viceDirectorSig ? (
                                  <img src={viceDirectorSig} alt="Academic Sig" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                                ) : null}
                              </div>
                              <span className="text-[9px] text-slate-400 block mb-1">ลงชื่อ......................................................</span>
                              <span className="text-[11px] font-bold text-slate-800">(นางสาวสุวรรณ บัวหลวง)</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">รองผู้อำนวยการกลุ่มบริหารงานวิชาการ</span>
                            </div>
                          </div>

                          {/* Row 3 - School Director (Moved to next line and centered) */}
                          <div className="grid grid-cols-1 gap-6 pt-4">
                            <div className="flex flex-col items-center text-center">
                              <span className="text-[11px] font-bold text-slate-900 mb-1">ผู้รับรองระดับสถานศึกษา</span>
                              <div className="h-12 flex items-end justify-center w-40 border-b border-dashed border-slate-300 pb-1 mb-1">
                                {directorSig ? (
                                  <img src={directorSig} alt="Director Sig" className="max-h-10 object-contain" referrerPolicy="no-referrer" />
                                ) : null}
                              </div>
                              <span className="text-[9px] text-slate-400 block mb-1">ลงชื่อ......................................................</span>
                              <span className="text-[11px] font-bold text-slate-800">(นายประจักษ์ ประมูลศิลป์)</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ผู้อำนวยการโรงเรียนเบญจมานุสรณ์</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Page 2 Footer */}
                    <div className="border-t border-slate-100 pt-3 mt-auto flex justify-between items-center text-[10px] font-bold text-slate-400 shrink-0">
                      <span>เอกสารรายงานผลการดำเนินงานกิจกรรม PLC (วช.13)</span>
                      <span>หน้า 2 / 2</span>
                    </div>
                  </div>

                </div>

                {/* Digital sign pads before rendering PDF */}
                {!isRecorder && !isCommittee && (
                  <div className="no-print bg-white p-6 rounded-[24px] border border-slate-150 shadow-sm mt-8 max-w-[210mm] mx-auto text-left">
                    <h5 className="font-bold text-sm text-gray-950 mb-4 flex items-center gap-2">
                      <span className="text-[#E13A9D]">✍️</span> ลงนามเอกสารดิจิทัลก่อนพิมพ์ (ลงลายมือชื่ออิเล็กทรอนิกส์)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <SignaturePad
                        label="1. รองฝ่ายวิชาการ"
                        name="นางสาวสุวรรณ บัวหลวง"
                        onSave={(img) => {
                          setViceDirectorSig(img);
                          if (viewingActivity && onSavePLC) {
                            onSavePLC({
                              ...viewingActivity,
                              signatures: {
                                ...viewingActivity.signatures,
                                viceDirectorSig: img
                              }
                            });
                          }
                        }}
                        savedImage={viceDirectorSig}
                        onClear={() => {
                          setViceDirectorSig('');
                          if (viewingActivity && onSavePLC) {
                            onSavePLC({
                              ...viewingActivity,
                              signatures: {
                                ...viewingActivity.signatures,
                                viceDirectorSig: undefined
                              }
                            });
                          }
                        }}
                      />
                      <SignaturePad
                        label="2. ผู้อำนวยการโรงเรียน"
                        name="นายประจักษ์ ประมูลศิลป์"
                        onSave={(img) => {
                          setDirectorSig(img);
                          if (viewingActivity && onSavePLC) {
                            onSavePLC({
                              ...viewingActivity,
                              signatures: {
                                ...viewingActivity.signatures,
                                directorSig: img
                              }
                            });
                          }
                        }}
                        savedImage={directorSig}
                        onClear={() => {
                          setDirectorSig('');
                          if (viewingActivity && onSavePLC) {
                            onSavePLC({
                              ...viewingActivity,
                              signatures: {
                                ...viewingActivity.signatures,
                                directorSig: undefined
                              }
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })()}

      {/* Global hover image preview */}
      {hoveredWorkImageUrl && (
        <div 
          className="fixed z-[999] p-2 bg-white rounded-2xl shadow-2xl border border-gray-100 pointer-events-none transition-all duration-150 ease-out animate-in fade-in zoom-in-95"
          style={{
            left: `${hoveredWorkImagePos.x}px`,
            top: `${hoveredWorkImagePos.y}px`,
            width: '340px',
            height: '255px',
          }}
        >
          <div className="w-full h-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center border border-gray-100">
            <img 
              src={hoveredWorkImageUrl} 
              alt="Preview Large" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

    </div>
  );
};
