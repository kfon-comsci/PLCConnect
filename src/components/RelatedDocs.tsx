import React from 'react';
import { AdminSettings, AppUser } from '../types';
import { FolderCheck, Upload, AlertCircle, ShieldAlert } from 'lucide-react';

interface RelatedDocsProps {
  adminSettings: AdminSettings;
  currentUser: AppUser;
}

export const RelatedDocs: React.FC<RelatedDocsProps> = ({ adminSettings, currentUser }) => {
  const isCommittee = currentUser.role === 'Committee';
  const userGrade = currentUser.assignedGrade || (currentUser.assignedClassroom ? currentUser.assignedClassroom.split('/')[0] : 'ม.1');

  const grades: ('ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6')[] = [
    'ม.1',
    'ม.2',
    'ม.3',
    'ม.4',
    'ม.5',
    'ม.6'
  ];

  // Helper to find the correct link from settings
  const getLink = (
    type: 'gradePlan' | 'subjectPlan' | 'activityPhoto',
    grade: 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6'
  ): string | null => {
    if (type === 'gradePlan') {
      const found = adminSettings.gradePlans?.find(p => p.gradeLevel === grade);
      return found?.link || null;
    } else if (type === 'subjectPlan') {
      const found = adminSettings.subjectPlans?.find(p => p.gradeLevel === grade);
      return found?.link || null;
    } else if (type === 'activityPhoto') {
      const found = adminSettings.activityPhotos?.find(p => p.gradeLevel === grade);
      return found?.link || null;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Card */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <FolderCheck className="w-6 h-6 text-[#7D57B2]" />
          เอกสารที่เกี่ยวข้อง (Related Documents)
        </h2>
        <p className="text-sm text-[#6A5077] mt-1 font-medium">
          ตารางส่งเอกสารการสอนและภาพกิจกรรมแยกตามระดับชั้น มัธยมศึกษาปีที่ 1 - 6 เชื่อมโยงเข้าสู่ Google Drive ปลายทางของโรงเรียน
        </p>

        {isCommittee && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-950 text-xs font-semibold">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              คุณอยู่ในสถานะ <span className="font-bold text-amber-900">"คณะกรรมการดำเนินงาน (Committee)"</span> สายชั้น <span className="font-bold text-amber-900">{userGrade}</span> — สามารถ Upload เอกสารได้เฉพาะระดับชั้น <span className="font-bold text-amber-900">{userGrade}</span> เท่านั้น
            </span>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 pb-4 mb-6">
          <h3 className="text-lg font-bold text-gray-950">
            ระบบจัดส่งและติดตามเอกสารวิชาการรายระดับชั้น
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            เมื่อกดปุ่ม Upload ของแต่ละระดับชั้นระบบจะเชื่อมต่อไปยังโฟลเดอร์ Google Drive สำหรับรับไฟล์เอกสาร/ภาพกิจกรรมที่ผู้ดูแลระบบกำหนดไว้
          </p>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-800 to-pink-700 text-white uppercase font-bold tracking-wider">
                <th className="px-6 py-4 text-sm font-black rounded-tl-2xl">ระดับชั้นเรียน</th>
                <th className="px-6 py-4 text-sm font-black text-center">แผนการสอนบูรณาการ</th>
                <th className="px-6 py-4 text-sm font-black text-center">แผนการสอนรายวิชา</th>
                <th className="px-6 py-4 text-sm font-black text-center rounded-tr-2xl">ภาพกิจกรรม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white font-medium text-gray-700">
              {grades.map((grade) => {
                const gradePlanLink = getLink('gradePlan', grade);
                const subjectPlanLink = getLink('subjectPlan', grade);
                const activityPhotoLink = getLink('activityPhoto', grade);
                const isJunior = ['ม.1', 'ม.2', 'ม.3'].includes(grade);
                const isAllowedForUser = !isCommittee || grade === userGrade;

                const rowBg = isJunior 
                  ? 'bg-emerald-50/70 hover:bg-emerald-100/90 text-slate-800' 
                  : 'bg-pink-50/70 hover:bg-pink-100/90 text-slate-800';

                return (
                  <tr key={grade} className={`${rowBg} transition duration-150`}>
                    {/* Column 1: Grade Level */}
                    <td className="px-6 py-5 text-sm font-extrabold text-gray-900">
                      มัธยมศึกษาปีที่ {grade.replace('ม.', '')}
                      {isCommittee && grade === userGrade && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-600 text-white text-[10px] rounded-md font-bold">สายชั้นของคุณ</span>
                      )}
                    </td>

                    {/* Column 2: แผนการสอนบูรณาการ (ปุ่ม Upload) */}
                    <td className="px-6 py-5 text-center">
                      {!isAllowedForUser ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title={`สิทธิ์ Upload เฉพาะครูประจำสายชั้น ${grade}`}>
                          <Upload className="w-3.5 h-3.5 text-gray-300" />
                          เฉพาะ {grade}
                        </div>
                      ) : gradePlanLink ? (
                        <a
                          href={gradePlanLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-[#7D57B2] hover:bg-[#6b48a0] text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload ↗
                        </a>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-50 border border-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title="ผู้ดูแลระบบยังไม่ได้ระบุลิงก์แผนการสอนระดับชั้น">
                          <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                          ยังไม่ระบุลิงก์
                        </div>
                      )}
                    </td>

                    {/* Column 3: แผนการสอนรายวิชา (ปุ่ม Upload) */}
                    <td className="px-6 py-5 text-center">
                      {!isAllowedForUser ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title={`สิทธิ์ Upload เฉพาะครูประจำสายชั้น ${grade}`}>
                          <Upload className="w-3.5 h-3.5 text-gray-300" />
                          เฉพาะ {grade}
                        </div>
                      ) : subjectPlanLink ? (
                        <a
                          href={subjectPlanLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-[#1696CC] hover:bg-[#1283b3] text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload ↗
                        </a>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-50 border border-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title="ผู้ดูแลระบบยังไม่ได้ระบุลิงก์แผนการสอนรายวิชา">
                          <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                          ยังไม่ระบุลิงก์
                        </div>
                      )}
                    </td>

                    {/* Column 4: ภาพกิจกรรม (ปุ่ม Upload) */}
                    <td className="px-6 py-5 text-center">
                      {!isAllowedForUser ? (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-100 border border-gray-200 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title={`สิทธิ์ Upload เฉพาะครูประจำสายชั้น ${grade}`}>
                          <Upload className="w-3.5 h-3.5 text-gray-300" />
                          เฉพาะ {grade}
                        </div>
                      ) : activityPhotoLink ? (
                        <a
                          href={activityPhotoLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-[#E13A9D] hover:bg-[#c92f8b] text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload ↗
                        </a>
                      ) : (
                        <div className="inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-gray-50 border border-gray-100 text-gray-400 rounded-xl text-xs font-semibold cursor-not-allowed select-none" title="ผู้ดูแลระบบยังไม่ได้ระบุลิงก์ภาพกิจกรรม">
                          <AlertCircle className="w-3.5 h-3.5 text-gray-300" />
                          ยังไม่ระบุลิงก์
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
