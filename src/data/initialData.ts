import { MasterInnovation, PLCActivity, ClassroomInnovation, AdminSettings, AppUser } from '../types';

export const initialAdminSettings: AdminSettings = {
  driveLinks: {
    flowchart: 'https://drive.google.com/drive/folders/flowchart_folder_id_123',
    brochure: 'https://drive.google.com/drive/folders/brochure_folder_id_456',
    workImage: 'https://drive.google.com/drive/folders/work_image_folder_id_789',
    activityCollection: 'https://drive.google.com/drive/folders/activity_collection_folder_id_abc',
    additionalDoc: 'https://drive.google.com/drive/folders/additional_doc_folder_id_def',
  },
  googleDriveLinks: [
    {
      id: 'link-1',
      gradeLevel: 'ม.1',
      room: '1',
      link: 'https://drive.google.com/drive/folders/bms_m1_1_placeholder',
      note: 'โฟลเดอร์รวบรวมไฟล์นวัตกรรมของนักเรียนห้อง ม.1/1'
    },
    {
      id: 'link-2',
      gradeLevel: 'ม.1',
      room: '2',
      link: 'https://drive.google.com/drive/folders/bms_m1_2_placeholder',
      note: 'โฟลเดอร์รวบรวมไฟล์นวัตกรรมของนักเรียนห้อง ม.1/2'
    },
    {
      id: 'link-3',
      gradeLevel: 'ม.4',
      room: '1',
      link: 'https://drive.google.com/drive/folders/bms_m4_1_placeholder',
      note: 'โฟลเดอร์รายงานและผลงานห้อง ม.4/1'
    }
  ],
  gradePlans: [
    {
      id: 'grade-1',
      gradeLevel: 'ม.1',
      link: 'https://drive.google.com/drive/folders/grade_m1_plans_placeholder',
      note: 'แผนการสอนบูรณาการระดับชั้น ม.1 และรูปภาพกิจกรรม'
    },
    {
      id: 'grade-2',
      gradeLevel: 'ม.4',
      link: 'https://drive.google.com/drive/folders/grade_m4_plans_placeholder',
      note: 'แผนการสอนบูรณาการและสื่อความรู้ ม.4'
    }
  ],
  subjectPlans: [
    {
      id: 'subject-1',
      gradeLevel: 'ม.1',
      link: 'https://drive.google.com/drive/folders/subject_m1_plans_placeholder',
      note: 'แผนการสอนรายวิชาต่าง ๆ สำหรับกลุ่มสาระฯ ม.1'
    }
  ]
};

export const defaultUsers: AppUser[] = [
  {
    email: 'admin1',
    role: 'Admin',
    name: 'นางสาวกนกรัตน์ จำเนียรสุข',
    password: '1234'
  },
  {
    email: 'bms1',
    role: 'Executive',
    name: 'นายปริวัตร วงษ์จันทร์',
    password: '1234'
  },
  {
    email: 'bms2',
    role: 'Executive',
    name: 'นายวันรบ บุญน่า',
    password: '1234'
  },
  {
    email: 'admin2',
    role: 'Admin',
    name: 'นายพงศธร ล้อมไธสง',
    password: '1234'
  },
  {
    email: 'T500',
    role: 'Committee',
    name: 'นางสาวนารีรัตน์ เทศกาล',
    password: '5555',
    assignedGrade: 'ม.5'
  },
  {
    email: 'ST603',
    role: 'Recorder',
    name: 'นางสาวบุษกรบุษ ภาระบุตร',
    password: '6666',
    assignedGrade: 'ม.6',
    assignedClassroom: 'ม.6/3'
  },
  {
    email: 'T609',
    role: 'Committee',
    name: 'นางสาวพันธวดี เพชรรางกูล',
    password: '6666',
    assignedGrade: 'ม.6'
  },
  {
    email: 'kanok.comsci@gmail.com',
    role: 'Admin',
    name: 'ครูกนก พงษ์สวัสดิ์ (Admin)',
    password: 'admin1234'
  }
];

export const initialMasterInnovations: MasterInnovation[] = [
  {
    id: 'master-m1',
    academicYear: 2569,
    semester: 1,
    gradeLevel: 'ม.1',
    theme: 'เกษตรอินทรีย์วิถีจันท์ (Chanthaburi Organic Agriculture)',
    competencies: {
      thai: 'อ่าน เขียน และวิเคราะห์เกี่ยวกับพันธุ์พืชพื้นเมืองและพฤกษศาสตร์ท้องถิ่นจังหวัดจันทบุรี',
      math: 'คำนวณสัดส่วน พื้นที่เพาะปลูก อัตราส่วนการผสมปุ๋ยชีวภาพ และน้ำหนักผลผลิตต่อไร่',
      science: 'ศึกษาการสังเคราะห์แสง การตอบสนองของพืช และองค์ประกอบของดินเชิงวิทยาศาสตร์',
      technology: 'ใช้ระบบ IoT ในการควบคุมความชื้นและการรดน้ำของสวนพืชตัวอย่าง',
      social: 'เรียนรู้ภูมิปัญญาไทยดั้งเดิม การแลกเปลี่ยนสินค้าชุมชน และการพึ่งพาตนเองตามหลักปรัชญาเศรษฐกิจพอเพียง',
      english: 'Create simple english brochures describing Chanthaburi organic fruits for tourists.',
      chinese: '学习关于尖竹汶府水果的简单汉语词汇 (学习、介绍)',
      career: 'ฝึกทักษะการเตรียมดิน การตอนกิ่ง การทำปุ๋ยชีวภาพ และการวางแผนดูแลพืชผล',
      health: 'ประเมินคุณค่าทางโภชนาการ ความปลอดภัยจากสารเคมี และการบริโภคอาหารอินทรีย์เพื่อสุขภาพ',
      art: 'ออกแบบบรรจุภัณฑ์และการจัดเรียงสินค้าให้น่าสนใจ ผสมผสานศิลปะลวดลายธรรมชาติ',
      guidance: 'เสริมสร้างความสามัคคี การแก้ปัญหาร่วมกันในฐานะทีม และค้นพบอาชีพที่น่าสนใจด้านเกษตรกรรมสมัยใหม่'
    },
    committees: [
      { id: 'c1', name: 'ครูสมศรี ศิริพงษ์', role: 'ประธาน', advisoryClass: 'ม.1/1' },
      { id: 'c2', name: 'ครูประภาส ยั่งยืน', role: 'รองประธาน', advisoryClass: 'ม.1/2' },
      { id: 'c3', name: 'ครูวันดี มีสุข', role: 'เลขานุการ', advisoryClass: 'ม.1/3' },
      { id: 'c4', name: 'ครูสุรพล เก่งกล้า', role: 'ประชาสัมพันธ์', advisoryClass: 'ม.1/4' },
      { id: 'c5', name: 'ครูเพ็ญศรี พูลผล', role: 'เหรัญญิก', advisoryClass: 'ม.1/5' }
    ]
  },
  {
    id: 'master-m4',
    academicYear: 2569,
    semester: 1,
    gradeLevel: 'ม.4',
    theme: 'Smart City Chanthaburi - เทคโนโลยีสีเขียวและการจัดการขยะ',
    competencies: {
      thai: 'แต่งคำประพันธ์และเขียนโครงงานวิชาการเพื่อรณรงค์รักษาสิ่งแวดล้อมในชุมชนเมืองจันทบุรี',
      math: 'การจัดการข้อมูลเชิงสถิติ ปริมาณขยะ คาดการณ์อัตราการเพิ่มของขยะในเขตเทศบาล',
      science: 'วิจัยปฏิกิริยาเคมีการย่อยสลายพลาสติก และการสร้างพลังงานชีวมวลจากเศษอาหารในเมือง',
      technology: 'ออกแบบและพัฒนาแอปพลิเคชันคัดแยกขยะอัจฉริยะ และการจำลองระบบ IoT เพื่อวัดคุณภาพอากาศ',
      social: 'ศึกษากฎหมายสิ่งแวดล้อม หน้าที่พลเมือง และการวางผังเมืองอัจฉริยะที่เป็นมิตรต่อสิ่งแวดล้อม',
      english: 'Present environmental solutions in English and write technical project summaries.',
      chinese: '撰写关于尖竹汶绿色城市和垃圾分类的中文海报和口号',
      career: 'ฝึกกระบวนการทำงานเชิงช่าง การแปรรูปวัสดุเหลือใช้ให้เป็นของตกแต่งมูลค่าสูง',
      health: 'ตระหนักถึงโรคภัยจากมลภาวะ การจัดการน้ำเน่าเสีย และสุขอนามัยในพื้นที่หนาแน่น',
      art: 'ออกแบบถังขยะอัจฉริยะ สถาปัตยกรรมสีเขียว และสื่อภาพกราฟิกอินโฟกราฟิกประชาสัมพันธ์',
      guidance: 'กระตุ้นจิตสาธารณะ การรับผิดชอบต่อโลก และค้นหาแนวทางศึกษาต่อระดับอุดมศึกษาด้านวิศวกรรมสิ่งแวดล้อม'
    },
    committees: [
      { id: 'c4-1', name: 'ครูอมร ศรีเจริญ', role: 'ประธาน', advisoryClass: 'ม.4/1' },
      { id: 'c4-2', name: 'ครูทศพล นำดี', role: 'รองประธาน', advisoryClass: 'ม.4/2' },
      { id: 'c4-3', name: 'ครูนารี ขยันดี', role: 'เลขานุการ', advisoryClass: 'ม.4/3' }
    ]
  }
];

export const initialPLCActivities: PLCActivity[] = [
  {
    id: 'plc-1',
    gradeLevel: 'ม.1',
    semester: 1,
    academicYear: 2569,
    groupName: 'เกษตรอินทรีย์วิถีจันท์ ม.1',
    times: 1,
    date: '2026-06-10',
    location: 'ห้องประชุมสวนพฤกษศาสตร์',
    durationHours: 6,
    durationMinutes: 0,
    plcLeader: 'ครูสมศรี ศิริพงษ์',
    expertRole1: 'ครูวันดี มีสุข',
    expertRole2: 'ครูประภาส ยั่งยืน',
    expertRole3: 'ดร.สุชาติ อุดมเกียรติ (ผู้เชี่ยวชาญคณะเกษตร)',
    expertRole4: 'ครูจงรักษ์ สมบูรณ์ (ฝ่ายวิชาการระดับชั้น)',
    otherParticipants: 'ครูผู้ช่วยและนักการภารโรงแผนกเกษตร',
    procedures: '1. ประชุมวิเคราะห์ปัญหาการเพาะปลูกพืชของนักเรียน\n2. กำหนดธีม "เกษตรอินทรีย์วิถีจันท์" ร่วมกัน\n3. กำหนดสมรรถนะเป้าหมาย 11 ด้านสำหรับนักเรียน ม.1',
    results: 'ได้ธีมและขอบเขตโครงงานนวัตกรรม และสร้างแผนการสอนบูรณาการ',
    suggestions: 'ควรเชิญตัวแทนนักเรียนมาร่วมสะท้อนคิดในครั้งต่อไป',
    images: [],
    recorderName: 'ครูสมศรี ศิริพงษ์',
    certifiedName: 'ดร.สมชาย ใจงาม (ผู้อำนวยการ)'
  },
  {
    id: 'plc-2',
    gradeLevel: 'ม.1',
    semester: 1,
    academicYear: 2569,
    groupName: 'เกษตรอินทรีย์วิถีจันท์ ม.1',
    times: 2,
    date: '2026-07-02',
    location: 'ห้องพักครูระดับชั้น ม.1',
    durationHours: 9,
    durationMinutes: 30,
    plcLeader: 'ครูสมศรี ศิริพงษ์',
    expertRole1: 'ครูเพ็ญศรี พูลผล',
    expertRole2: 'ครูสุรพล เก่งกล้า',
    expertRole3: 'ผศ.ดร.รักษ์ สุขใจ',
    expertRole4: 'ครูวันดี มีสุข (เลขานุการ)',
    otherParticipants: '-',
    procedures: '1. ติดตามผลการดำเนินงานของแต่ละห้องเรียน\n2. วิเคราะห์ประเด็นติดขัดเกี่ยวกับการเตรียมหน้าดินและการใช้ปุ๋ยเปลือกทุเรียน\n3. หาแนวทางแก้ไขปัญหากลิ่นปุ๋ยชีวภาพ',
    results: 'ห้องเรียน ม.1/1 และ ม.1/2 รายงานความก้าวหน้าอย่างชัดเจน มีการใช้สารสกัดชีวภาพลดกลิ่น',
    suggestions: 'เน้นให้นักเรียนจดบันทึกปริมาณสารอาหารอย่างเป็นระบบ',
    images: [],
    recorderName: 'ครูสมศรี ศิริพงษ์',
    certifiedName: 'ดร.สมชาย ใจงาม (ผู้อำนวยการ)'
  },
  {
    id: 'plc-3',
    gradeLevel: 'ม.4',
    semester: 1,
    academicYear: 2569,
    groupName: 'Smart City Chanthaburi ม.4',
    times: 1,
    date: '2026-06-15',
    location: 'ห้องคอมพิวเตอร์ 3',
    durationHours: 10,
    durationMinutes: 0,
    plcLeader: 'ครูอมร ศรีเจริญ',
    expertRole1: 'ครูทศพล นำดี',
    expertRole2: 'ครูนารี ขยันดี',
    expertRole3: 'นายวิศรุต สุขเกษม (โปรแกรมเมอร์จิตอาสา)',
    expertRole4: 'ครูสมเจตน์ เจริญตา (หัวหน้ากลุ่มสาระวิทยาศาสตร์ฯ)',
    otherParticipants: '-',
    procedures: '1. ประชุมสร้างความเข้าใจกรอบแนวคิด Smart City\n2. พัฒนาระบบจัดหมวดหมู่ข้อมูลขยะ\n3. ปรับแผนการใช้เทคโนโลยี IoT',
    results: 'โครงสร้างฐานข้อมูลแอปพลิเคชันคัดแยกขยะถูกกำหนดขึ้นพร้อมสกีมาสำหรับจัดเก็บรูปภาพ',
    suggestions: 'ควรติดตั้งเซ็นเซอร์จริงในพื้นที่เทศบาลเพื่อให้นักเรียนได้วิเคราะห์ข้อมูลจริง',
    images: [],
    recorderName: 'ครูอมร ศรีเจริญ',
    certifiedName: 'ดร.สมชาย ใจงาม (ผู้อำนวยการ)'
  },
  {
    id: 'plc-4',
    gradeLevel: 'ม.4',
    semester: 1,
    academicYear: 2569,
    groupName: 'Smart City Chanthaburi ม.4',
    times: 2,
    date: '2026-07-10',
    location: 'ห้องประชุมกลุ่มสาระวิทยาศาสตร์ฯ',
    durationHours: 12,
    durationMinutes: 0,
    plcLeader: 'ครูอมร ศรีเจริญ',
    expertRole1: 'ครูทศพล นำดี',
    expertRole2: 'ครูนารี ขยันดี',
    expertRole3: 'นายวิศรุต สุขเกษม',
    expertRole4: 'ครูสมเจตน์ เจริญตา',
    otherParticipants: 'นร.แกนนําชุมชนห้อง ม.4/1',
    procedures: '1. ทดสอบการรันแบบจำลองปัญญาประดิษฐ์ (AI Core)\n2. ทดลองอัปโหลดภาพขยะเพื่อจัดหมวดหมู่ในระดับห้องเรียน',
    results: 'โมเดลสามารถคัดแยกแก้ว พลาสติก และกระดาษ ได้แม่นยำ 85%',
    suggestions: 'เพิ่มกลุ่มภาพใบตองและขยะเศษอาหารเมืองจันท์เพื่อความสมบูรณ์',
    images: [],
    recorderName: 'ครูอมร ศรีเจริญ',
    certifiedName: 'ดร.สมชาย ใจงาม (ผู้อำนวยการ)'
  }
];

export const initialClassroomInnovations: ClassroomInnovation[] = [
  {
    id: 'class-m1-1',
    masterId: 'master-m1',
    classroomName: 'ม.1/1',
    innovationName: 'ปุ๋ยหมักชีวภาพจากเปลือกทุเรียนและมังคุดสูตรเร่งดอกใบ',
    memberCount: 38,
    committees: {
      president: 'เด็กชายกิตติศักดิ์ มีชัย',
      vicePresident: 'เด็กหญิงพิมชนก ร่มเย็น',
      publicRelations: 'เด็กชายธนากร ดีใจ',
      treasurer: 'เด็กหญิงอลิสา อิ่มสุข',
      secretary: 'เด็กหญิงกานดา รักเรียน'
    },
    briefDetails: 'การนำเปลือกทุเรียนและเปลือกมังคุดที่เหลือทิ้งจากการจำหน่ายในตลาดชุมชนเมืองจันทบุรี มาหมักและย่อยสลายเพื่อสร้างปุ๋ยที่มีสัดส่วนโพแทสเซียมสูง ช่วยบำรุงพืชผักสวนครัวและพืชดอกสีสด',
    goals: '1. เพื่อลดปริมาณขยะเกษตรเหลือทิ้งในชุมชนลง 20%\n2. เพื่อสร้างปุ๋ยชีวภาพคุณภาพสูงสำหรับสวนพืชโรงเรียนและนำไปจำหน่ายเสริมรายได้',
    expectedBenefits: 'นักเรียนได้เรียนรู้กระบวนการวิทยาศาสตร์ชีวภาพ การทำธุรกิจขนาดย่อม และการลดมลพิษในท้องถิ่น',
    competencies: {
      thai: 'แต่งโครงงานเรื่องการนำเปลือกผลไม้มาหมักปุ๋ย พร้อมจัดทำนิทรรศการปากเปล่า',
      math: 'ชั่งตวงส่วนผสม เปลือกผลไม้ 3 ส่วน ต่อน้ำตาล 1 ส่วน และพืชสดสับ 1 ส่วน คำนวณเป็นอัตราร้อยละ',
      science: 'สังเกตการเติบโตของจุลินทรีย์และการเปลี่ยนแปลงค่าความเป็นกรด-ด่าง (pH) ในน้ำหมัก',
      technology: 'ออกแบบคิวอาร์โค้ดสติกเกอร์แปะข้างขวดบรรจุภัณฑ์เพื่อให้ลูกค้าแกะอ่านวิธีใช้ได้รวดเร็ว',
      social: 'เผยแพร่องค์ความรู้ให้ผู้ปกครองนักเรียน และจัดทำรายงานรายได้และรายจ่ายของห้องเรียนตามหลักความพอเพียง',
      english: 'Write simple packaging labels in English: "Chanthaburi Fruit Bio-Fertilizer, 100% Organic".',
      chinese: '把瓶贴翻译成简单的中文，标明“天然有机肥料”',
      career: 'ฝึกกระบวนการผลิต การบรรจุลงขวดพลาสติก และการสร้างความสะอาดปลอดภัยในโรงเพาะ',
      health: 'ล้างมือและสวมหน้ากากป้องกันกลิ่นฉุน ปลอดจากจุลินทรีย์ก่อโรค',
      art: 'ออกแบบสติกเกอร์ตราสินค้าแบรนด์ "Durian-Magic Bio" ในสไตล์ธรรมชาติโมเดิร์น',
      guidance: 'เรียนรู้การทำงานร่วมกัน แก้ปัญหาความเห็นต่าง ค้นพบอาชีพนวัตกรอาหารและเกษตรกรแนวใหม่'
    },
    reporterName: 'ครูสมศรี ศิริพงษ์',
    classroomPresident: 'เด็กชายกิตติศักดิ์ มีชัย',
    files: {
      flowchart: {
        name: 'flowchart_m1_1_fermentation.pdf',
        status: 'success',
        url: 'https://drive.google.com/open?id=flowchart_m1_1_fermentation'
      },
      brochure: {
        name: 'brochure_m1_1_biopower.pdf',
        status: 'success',
        url: 'https://drive.google.com/open?id=brochure_m1_1_biopower'
      },
      workImage: {
        name: 'photo_durian_magic_pack.jpg',
        status: 'success',
        url: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400'
      }
    }
  },
  {
    id: 'class-m4-1',
    masterId: 'master-m4',
    classroomName: 'ม.4/1',
    innovationName: 'แอปพลิเคชันคัดแยกขยะอัจฉริยะ “BMS GreenBin” ด้วยระบบประมวลผลภาพถ่าย AI',
    memberCount: 40,
    committees: {
      president: 'นายอภิชาติ ประสบผล',
      vicePresident: 'นางสาววิภาดา แก้วรุ่ง',
      publicRelations: 'นายรุ่งโรจน์ สุวรรณ',
      treasurer: 'นางสาวกุลธิดา โตเจริญ',
      secretary: 'นางสาวณิชาภา งามวิจิตร'
    },
    briefDetails: 'การสร้างโปรแกรมตรวจจับชนิดขยะ เช่น ขวดพลาสติก แก้ว กระดาษ โดยนักเรียนส่องกล้องผ่านแอปพลิเคชัน จากนั้นระบบจะแสดงประเภทของถังขยะที่ถูกต้อง พร้อมระบบสะสมคะแนนรักษ์โลกของโรงเรียน',
    goals: '1. เพื่อเพิ่มสัดส่วนการแยกขยะที่ถูกต้องในอาคารเรียน 80%\n2. เพื่อส่งเสริมนักเรียนให้นำเทคโนโลยีปัญญาประดิษฐ์และสะสมคะแนนแลกของรางวัล',
    expectedBenefits: 'ขยะได้รับการคัดแยกอย่างดี นักเรียนทุกคนสนุกสนานกับการรักษ์โลก มีระบบนิเวศข้อมูลขยะโรงเรียน',
    competencies: {
      thai: 'เขียนพรรณนาเชิงเปรียบเทียบในประเด็น "ขยะเมืองจันท์กับอนาคตเมืองอัจฉริยะ" พร้อมรายงานวิชาการ',
      math: 'วิเคราะห์สถิติประเภทและปริมาณขยะรายวัน นำเสนอเป็นกราฟเส้นและพายชาร์ตเปรียบเทียบ',
      science: 'ศึกษาอัตราความคงตัวทางกายภาพของขยะกลุ่มต่างๆ และปัญหาขยะไมโครพลาสติกปนเปื้อนในดิน',
      technology: 'เขียนโปรแกรมด้วยภาษา Python พัฒนาร่วมกับระบบคัดแยกด้วย AI แพลตฟอร์มพึ่งตนเอง',
      social: 'ประยุกต์ใช้แนวทางจิตอาสาในโรงเรียน และการผลักดันนโยบาย Zero Waste ระดับกลุ่มสาระฯ',
      english: 'Create an oral PowerPoint presentation in English for external visitors regarding GreenBin.',
      chinese: '编写应用程序界面中文指南，方便中籍师生使用',
      career: 'ฝึกกระบวนการทำงานแบบ Tech Startup การแบ่งความรับผิดชอบและการวางสถาปัตยกรรมระบบ',
      health: 'วิเคราะห์อันตรายจากสารเคมีหลงเหลือในบรรจุภัณฑ์ขยะ และรักษาสุขอนามัยของถังจัดเก็บขยะ',
      art: 'จัดหน้าตาหน้าจอผู้ใช้ (UI/UX) ที่เป็นมิตร สีสันสวยงาม และไอคอนสไตล์กลมมน',
      guidance: 'เข้าใจบทบาทของงานด้านเทคโนโลยีปัญญาประดิษฐ์ วิศวกรซอฟต์แวร์ และงานรักษ์โลกที่ส่งผลระดับประเทศ'
    },
    reporterName: 'ครูอมร ศรีเจริญ',
    classroomPresident: 'นายอภิชาติ ประสบผล',
    files: {
      flowchart: {
        name: 'flowchart_m4_1_ai_logic.pdf',
        status: 'success',
        url: 'https://drive.google.com/open?id=flowchart_m4_1_ai_logic'
      },
      workImage: {
        name: 'photo_smart_greenbin_app.jpg',
        status: 'success',
        url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400'
      }
    }
  }
];
