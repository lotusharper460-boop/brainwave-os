'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client';

export default function DiscoverySurvey() {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  
  // State for all 38 questions
  const [A, setA] = useState<Record<string, any>>({
    q2: [], q7: [], q8: [], q9: [], q10: {}, q13: [], q20: [], q21: [], 
    ratings_finance: {}, ratings_student: {}, ratings_attendance: {}, 
    ratings_academic: {}, ratings_communication: {}, ratings_analytics: {}
  })

  const setVal = (key: string, val: any) => {
    setErrorMsg(""); 
    setA(prev => ({ ...prev, [key]: val }));
  }
  
  const toggleArr = (key: string, val: string) => {
    setErrorMsg("");
    setA(prev => ({
      ...prev, 
      [key]: prev[key].includes(val) ? prev[key].filter((x: string) => x !== val) : [...prev[key], val]
    }));
  }

  const handleRank = (opt: string) => {
    setErrorMsg("");
    const ranks = { ...A.q10 };
    if (ranks[opt]) delete ranks[opt];
    else if (Object.keys(ranks).length < 3) ranks[opt] = Object.keys(ranks).length + 1;
    setVal('q10', ranks);
  }

  // --- STRICT VALIDATION: FORCES ALL QUESTIONS TO BE ANSWERED ---
  const validateStep = () => {
    if (step === 0) {
      if (!A.school_name || !A.proprietor_name || !A.role || !A.phone || !A.email) return "Please complete all fields in this section.";
    }
    if (step === 1) {
      if (!A.q1 || A.q2.length === 0 || !A.q3 || !A.q4 || !A.q5 || !A.q6) return "Please answer all school profile questions.";
    }
    if (step === 2) {
      if (A.q7.length === 0 || A.q8.length === 0 || A.q9.length === 0 || Object.keys(A.q10).length === 0 || !A.q11 || !A.q12 || !A.q12_desc) return "Please answer all operations questions and rank your challenges.";
    }
    if (step === 3) {
      if (A.q13.length === 0 || !A.q14 || !A.q15 || !A.q16 || !A.q16_desc || !A.q17) return "Please complete all technology readiness questions.";
    }
    if (step === 4) {
      if (
        Object.keys(A.ratings_finance).length < 7 || 
        Object.keys(A.ratings_student).length < 5 || 
        Object.keys(A.ratings_attendance).length < 4 || 
        Object.keys(A.ratings_academic).length < 5 || 
        Object.keys(A.ratings_communication).length < 4 || 
        Object.keys(A.ratings_analytics).length < 4
      ) return "Please rate every feature (1-5) to help us prioritize.";
    }
    if (step === 5) {
      if (!A.q18 || !A.q19 || A.q20.length === 0 || A.q21.length === 0 || !A.q22 || !A.q23) return "Please answer all willingness to pay questions.";
    }
    if (step === 6) {
      if (!A.q24 || !A.q25 || !A.q26 || !A.q27 || !A.q28) return "Please provide feedback for all open questions.";
    }
    return "";
  }

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setErrorMsg(error);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep(s => s + 1); 
    window.scrollTo(0,0);
  }

  const submitForm = async () => {
    const errorMsg = validateStep();
    if (errorMsg) {
      setErrorMsg(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    
    // --- EXACT 1:1 SQL SCHEMA MAPPING (PREVENTS DATABASE CRASHES) ---
    // Note: We DO NOT use "...A" here to prevent sending wrong column names.
    const payload = {
      school_name: A.school_name,
      respondent_name: A.proprietor_name,
      role: A.role,
      phone_number: A.phone,
      email_address: A.email, // Maps to email_address in your DB
      date_administered: new Date().toISOString(),
      
      q1_enrollment: A.q1,
      q2_levels_offered: A.q2,
      q3_staff_count: A.q3,
      q4_class_count: A.q4,
      q5_average_fee: A.q5,
      q6_city_area: A.q6,
      
      q7_manage_records: A.q7,
      q8_track_fees: A.q8,
      q9_take_attendance: A.q9,
      q10_top_challenges: A.q10,
      q11_admin_time_spent: A.q11,
      q12_error_frequency: A.q12,
      q12b_recent_error_desc: A.q12_desc,
      
      q13_devices_used: A.q13,
      q14_internet_access: A.q14,
      q15_parent_smartphones: A.q15,
      q16_used_software_before: A.q16,
      q16b_software_feedback: A.q16_desc,
      q17_personal_tech_comfort: A.q17,
      
      feature_finance: A.ratings_finance,
      feature_student: A.ratings_student,
      feature_attendance: A.ratings_attendance, 
      feature_academic: A.ratings_academic,
      feature_communication: A.ratings_communication,
      feature_analytics: A.ratings_analytics,
      
      q18_willing_to_pay: A.q18,
      q19_payment_structure: A.q19,
      q20_premium_features: A.q20,
      q21_refuse_to_pay_reasons: A.q21,
      q22_current_admin_spend: A.q22,
      q23_free_trial_opt_in: A.q23,
      
      q24_biggest_problem: A.q24,
      q25_desperate_feature: A.q25,
      q26_advice_to_proprietors: A.q26,
      q27_launch_day_requirement: A.q27,
      q28_other_comments: A.q28
    };

    const { error } = await supabase.from('research_responses').insert([payload]);
    
    if (!error) {
      setDone(true);
    } else {
      setErrorMsg("Database Error: " + error.message);
    }
    setLoading(false);
  }

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-[#E5C100] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(229,193,0,0.3)]">
        <svg className="w-10 h-10 text-[#1A1A1B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-[#E5E7EB] styled-heading">Research Complete</h1>
      <p className="text-[#9CA3AF] mt-3 max-w-md leading-relaxed">Your responses have been securely encrypted and recorded. Thank you for shaping the future of education.</p>
    </div>
  )

  return (
    <main className="min-h-screen pb-32">
      <div className="fixed top-0 left-0 w-full h-1 bg-[#37373A] z-50">
        <div className="h-full bg-[#00B8CC] transition-all duration-500 shadow-[0_0_10px_rgba(0,184,204,0.5)]" style={{ width: `${((step + 1) / 7) * 100}%` }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold text-[#E5C100] tracking-[0.2em] uppercase mb-3">Educational Infrastructure Study</p>
          <h1 className="text-3xl styled-heading">School Discovery Questionnaire</h1>
        </div>

        {errorMsg && (
          <div className="error-toast border-red-500 bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3 font-bold shadow-[0_0_15px_rgba(255,0,0,0.2)]">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {errorMsg}
          </div>
        )}

        <div className="survey-card">
          
          {/* STEP 0: DETAILS */}
          {step === 0 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header">
                <h2 className="text-xl font-bold text-[#E5E7EB]">Respondent Details</h2>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex items-start gap-4 p-5 bg-[rgba(0,184,204,0.05)] border border-[rgba(0,184,204,0.2)] rounded-xl mb-6">
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#00B8CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-xs text-[#E5E7EB] leading-relaxed">
                    <strong className="text-[#00B8CC] block mb-1">Strictly Confidential</strong>
                    All information shared will be kept strictly confidential and used only for product research.
                  </p>
                </div>

                <div><label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Name of School *</label>
                <input className="input-soft" placeholder="Enter school name" onChange={e => setVal('school_name', e.target.value)} value={A.school_name || ''} /></div>
                
                <div><label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Proprietor Name *</label>
                <input className="input-soft" placeholder="Enter full name" onChange={e => setVal('proprietor_name', e.target.value)} value={A.proprietor_name || ''} /></div>
                
                <div><label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Role / Position *</label>
                <input className="input-soft" placeholder="e.g. Proprietor, Principal" onChange={e => setVal('role', e.target.value)} value={A.role || ''} /></div>

                <div><label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Phone Number *</label>
                <input className="input-soft" type="tel" placeholder="080..." onChange={e => setVal('phone', e.target.value)} value={A.phone || ''} /></div>
                
                <div><label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Email Address *</label>
                <input className="input-soft" type="email" placeholder="school@email.com" onChange={e => setVal('email', e.target.value)} value={A.email || ''} /></div>
              </div>
            </div>
          )}

          {/* STEP 1: PROFILE */}
          {step === 1 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 01: School Profile</h2></div>
              <div className="p-8 space-y-8">
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q1. Student Enrollment? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Under 100', '101–200', '201–350', '351–500', '501–750', 'Above 750'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q1 === opt ? 'option-active' : ''}`} onClick={() => setVal('q1', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q2. Levels Offered? (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Crèche / Nursery', 'Primary (1–6)', 'Junior Secondary (JSS 1–3)', 'Senior Secondary (SSS 1–3)'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q2.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q2', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q3. Staff count (Teaching & Non-teaching)? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['1–10 staff', '11–25 staff', '26–50 staff', '51–100 staff', 'Above 100 staff'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q3 === opt ? 'option-active' : ''}`} onClick={() => setVal('q3', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q4. How many classes / streams exist? *</p>
                  <input className="input-soft" type="number" placeholder="Total number of classes" onChange={e => setVal('q4', e.target.value)} value={A.q4 || ''} />
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q5. Average school fee per student per term? (₦) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Below ₦20,000', '₦20,001–₦40,000', '₦40,001–₦70,000', '₦70,001–₦100,000', '₦100,001–₦200,000', 'Above ₦200,000'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q5 === opt ? 'option-active' : ''}`} onClick={() => setVal('q5', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q6. Which city and area is your school located in? *</p>
                  <input className="input-soft" placeholder="City / LGA / Area" onChange={e => setVal('q6', e.target.value)} value={A.q6 || ''} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: OPERATIONS */}
          {step === 2 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 02: Operations</h2></div>
              <div className="p-8 space-y-8">
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q7. How do you manage student records? (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Paper files', 'Excel / Sheets', 'Existing software', 'WhatsApp', 'No formal system'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q7.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q7', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q8. How do you track school fees? (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Cash/Paper receipts', 'Bank transfers', 'POS machine', 'Existing software', 'No consistent tracking'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q8.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q8', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q9. How do you take attendance? (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Paper register', 'WhatsApp message', 'Excel spreadsheet', 'Existing software', 'Not tracked'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q9.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q9', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q10. Rank top 3 administrative challenges *</p>
                  <div className="space-y-3">
                    {['Fee Tracking', 'Report Cards', 'Parent Communication', 'Attendance', 'Staff Payroll', 'Academic Records', 'Bulk SMS', 'Timetabling'].map(opt => (
                      <button key={opt} className={`option-btn flex gap-3 ${A.q10[opt] ? 'option-active' : ''}`} onClick={() => handleRank(opt)}>
                        <div className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-200 ${A.q10[opt] ? 'bg-[#00B8CC] text-[#1A1A1B] border-[#00B8CC]' : 'border-[#37373A] text-[#9CA3AF]'}`}>
                          {A.q10[opt] || ''}
                        </div>
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q11. Admin time spent per week on records? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Less than 2 hours', '2–5 hours', '5–10 hours', '10–20 hours', 'More than 20 hours'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q11 === opt ? 'option-active' : ''}`} onClick={() => setVal('q11', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q12. How often do errors occur? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {['Rarely', 'Sometimes', 'Often', 'Very often'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q12 === opt ? 'option-active' : ''}`} onClick={() => setVal('q12', opt)}>{opt}</button>
                    ))}
                  </div>
                  <textarea className="input-soft h-24 resize-none" placeholder="Q12b. Describe a recent error... *" onChange={e => setVal('q12_desc', e.target.value)} value={A.q12_desc || ''} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: TECH READINESS */}
          {step === 3 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 03: Tech Readiness</h2></div>
              <div className="p-8 space-y-8">
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q13. Devices used by staff regularly (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Smartphone (Android)', 'Smartphone (iPhone)', 'Laptop / Desktop', 'Tablet', 'No consistent device'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q13.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q13', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q14. How is internet access at your school? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Excellent', 'Good', 'Fair', 'Poor', 'No internet'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q14 === opt ? 'option-active' : ''}`} onClick={() => setVal('q14', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q15. Do most parents own a smartphone? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Almost all', 'Most (70%+)', 'About half', 'Less than half', 'Very few'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q15 === opt ? 'option-active' : ''}`} onClick={() => setVal('q15', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q16. Have you used school software before? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    {['Yes — currently using', 'Yes — tried but stopped', 'No — heard of them', 'No — never considered'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q16 === opt ? 'option-active' : ''}`} onClick={() => setVal('q16', opt)}>{opt}</button>
                    ))}
                  </div>
                  <textarea className="input-soft h-24 resize-none" placeholder="Q16b. If yes, which one? If no, type N/A *" onChange={e => setVal('q16_desc', e.target.value)} value={A.q16_desc || ''} />
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q17. Comfort level with new software? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Very comfortable', 'Somewhat comfortable', 'Not very comfortable', 'Prefer paper'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q17 === opt ? 'option-active' : ''}`} onClick={() => setVal('q17', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: FEATURE PRIORITY */}
          {step === 4 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 04: Feature Priority</h2></div>
              <div className="p-8 space-y-10">
                <p className="text-xs font-bold text-[#E5C100] uppercase tracking-wider">Rate all features: 1 = Not needed · 5 = Critical *</p>
                {[
                  { section: 'A. Finance', stateKey: 'ratings_finance', items: ['Track debtors', 'Auto SMS fee reminders', 'Generate official receipts', 'Online payments', 'View total fees', 'Track other income', 'Manage staff salaries'] },
                  { section: 'B. Student Mgt', stateKey: 'ratings_student', items: ['Digital bio-data records', 'Academic history', 'Promotions tracking', 'Digital admissions', 'Student photos'] },
                  { section: 'C. Attendance', stateKey: 'ratings_attendance', items: ['Teachers mark on phone', 'Auto SMS for absent', 'Attendance history', 'Generate reports'] },
                  { section: 'D. Academic', stateKey: 'ratings_academic', items: ['CA/Exam marks entry', 'Auto-calculate grades', 'Generate report cards', 'Parent app access', 'Track performance trends'] },
                  { section: 'E. Communication', stateKey: 'ratings_communication', items: ['Bulk SMS to parents', 'Targeted class messages', 'Parents reply in app', 'Staff noticeboard'] },
                  { section: 'F. Analytics', stateKey: 'ratings_analytics', items: ['Dashboard summary', 'AI insights', 'Compare class performance', 'Multiple branches view'] }
                ].map(group => (
                  <div key={group.section} className="space-y-4">
                    <h3 className="font-bold text-[#00B8CC] border-b border-[#37373A] pb-2">{group.section}</h3>
                    {group.items.map(item => (
                      <div key={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#1A1A1B] rounded-xl border border-[#37373A]">
                        <p className="text-sm text-[#E5E7EB] flex-1">{item}</p>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(n => (
                            <button key={n} onClick={() => { setErrorMsg(""); setA(prev => ({...prev, [group.stateKey]: {...prev[group.stateKey], [item]: n}}))}} 
                              className={`rating-btn ${A[group.stateKey]?.[item] === n ? 'rating-active' : ''}`}>{n}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: WILLINGNESS TO PAY */}
          {step === 5 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 05: Willingness to Pay</h2></div>
              <div className="p-8 space-y-8">
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q18. Monthly budget for full solution? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Nothing', '₦5,000–₦10,000', '₦10,001–₦20,000', '₦20,001–₦35,000', '₦35,001–₦60,000', 'Above ₦60,000'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q18 === opt ? 'option-active' : ''}`} onClick={() => setVal('q18', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q19. Preferred payment structure? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Monthly', 'Per term', 'Annual', 'One-time purchase', 'Free only'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q19 === opt ? 'option-active' : ''}`} onClick={() => setVal('q19', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q20. Would pay more for (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Auto SMS', 'AI insights', 'Online portal', 'Dedicated support', 'Parent app', 'Multi-campus'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q20.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q20', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q21. Dealbreakers / Refusal reasons (Tick all) *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Price too high', 'Too complicated', 'Poor internet required', 'Data security', 'Staff resistance', 'Lack of support', 'Unstable'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q21.includes(opt) ? 'option-active' : ''}`} onClick={() => toggleArr('q21', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q22. Current admin spend per month? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Below ₦5k', '₦5k–₦15k', '₦15k–₦30k', '₦30k–₦60k', 'Above ₦60k', 'Never calculated'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q22 === opt ? 'option-active' : ''}`} onClick={() => setVal('q22', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
                <div><p className="font-semibold text-[#E5E7EB] mb-3">Q23. Would you sign up for a free trial? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['Yes — definitely', 'Probably yes', 'Maybe', 'Probably not', 'Definitely not'].map(opt => (
                      <button key={opt} className={`option-btn ${A.q23 === opt ? 'option-active' : ''}`} onClick={() => setVal('q23', opt)}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: FEEDBACK */}
          {step === 6 && (
            <div className="animate-in fade-in duration-300">
              <div className="sec-header"><h2 className="text-xl font-bold text-[#E5E7EB]">Section 06: Open Feedback</h2></div>
              <div className="p-8 space-y-6">
                <div><p className="font-semibold text-[#E5E7EB] mb-2">Q24. Single biggest problem software must solve? *</p>
                  <textarea className="input-soft h-24 resize-none" onChange={e => setVal('q24', e.target.value)} value={A.q24 || ''} /></div>
                <div><p className="font-semibold text-[#E5E7EB] mb-2">Q25. Desperate missing feature? *</p>
                  <textarea className="input-soft h-24 resize-none" onChange={e => setVal('q25', e.target.value)} value={A.q25 || ''} /></div>
                <div><p className="font-semibold text-[#E5E7EB] mb-2">Q26. Advice to other proprietors before buying? *</p>
                  <textarea className="input-soft h-24 resize-none" onChange={e => setVal('q26', e.target.value)} value={A.q26 || ''} /></div>
                <div><p className="font-semibold text-[#E5E7EB] mb-2">Q27. What must be true to sign up on day one? *</p>
                  <textarea className="input-soft h-24 resize-none" onChange={e => setVal('q27', e.target.value)} value={A.q27 || ''} /></div>
                <div><p className="font-semibold text-[#E5E7EB] mb-2">Q28. Other comments/concerns? *</p>
                  <textarea className="input-soft h-24 resize-none" placeholder="Type N/A if none..." onChange={e => setVal('q28', e.target.value)} value={A.q28 || ''} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-[#1A1A1B] border-t border-[#37373A] z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          {step > 0 && (
            <button className="flex-1 py-3.5 border border-[#37373A] text-[#E5E7EB] rounded-xl font-semibold bg-[#242426] hover:bg-[#2A2A2D] transition-all" onClick={() => { setErrorMsg(""); setStep(s => s - 1); }}>
              Back
            </button>
          )}
          <button 
            className="flex-[2.5] py-3.5 bg-[#00B8CC] text-[#1A1A1B] rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(0,184,204,0.3)] hover:shadow-[0_0_25px_rgba(0,184,204,0.5)]"
            onClick={step === 6 ? submitForm : handleNext}>
            {loading ? 'Submitting...' : step === 6 ? 'Submit Questionnaire' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  );
}