"use client";

import React, { useState } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function ResearchInstrument() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  // Initialize state mapped exactly to your Supabase schema
  const [formData, setFormData] = useState({
    school_name: '', respondent_name: '', role: '', phone_number: '', email_address: '',
    q1_enrollment: '', q2_levels_offered: [] as string[], q3_staff_count: '', q5_average_fee: '',
    q7_manage_records: [] as string[], q10_top_challenges: [] as string[],
    feature_finance: {} as Record<string, number>,
    feature_student: {} as Record<string, number>,
    q18_willing_to_pay: '', q24_biggest_problem: ''
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxArray = (field: string, value: string) => {
    setFormData((prev: any) => {
      const array = prev[field] || [];
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter((item: string) => item !== value) };
      } else {
        return { ...prev, [field]: [...array, value] };
      }
    });
  };

  const handleFeatureRating = (category: string, featureName: string, rating: number) => {
    setFormData((prev: any) => ({
      ...prev,
      [category]: { ...prev[category], [featureName]: rating }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const { error } = await supabase
        .from('research_responses')
        .insert([{ ...formData, date_administered: new Date().toISOString() }]);

      if (error) throw error;
      
      setSubmitStatus('success');
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Transmission Error:", error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans text-gray-900">
        <div className="bg-white p-8 rounded border border-gray-200 shadow-sm max-w-lg w-full text-center space-y-4">
          <h2 className="text-2xl font-bold">Data Transmitted</h2>
          <p className="text-gray-600">Your responses have been successfully logged in the research ledger. Thank you for your participation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto bg-white rounded shadow-sm border border-gray-200 p-6 md:p-10">
        
        <div className="border-b border-gray-200 pb-8 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Educational Infrastructure Research Study
          </h1>
          <p className="text-gray-600 text-sm md:text-base leading-relaxed">
            This instrument is designed to understand operational challenges and shape a localized school management architecture. All data is strictly confidential.
          </p>
        </div>

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
            A database transmission error occurred. Please verify your connection and try again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* RESPONDENT DETAILS */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">Institution Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name of School *</label>
                <input required type="text" name="school_name" onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name of Respondent *</label>
                <input required type="text" name="respondent_name" onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role / Position *</label>
                <input required type="text" name="role" onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number *</label>
                <input required type="tel" name="phone_number" onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Email Address *</label>
                <input required type="email" name="email_address" onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none" />
              </div>
            </div>
          </section>

          {/* SECTION 01: SCHOOL PROFILE */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">School Profile [cite: 10]</h2>
            
            <div className="space-y-4">
              <label className="text-sm font-medium block">How many students are currently enrolled?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Under 100 students', '101 - 200 students', '201 - 350 students', '351 - 500 students', '501 - 750 students', 'Above 750 students'].map((opt) => (
                  <label key={opt} className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name="q1_enrollment" value={opt} onChange={handleTextChange} className="h-4 w-4 text-gray-900" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-sm font-medium block">What is the average school fee per student per term?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Below ₦20,000', '₦20,001 - ₦40,000', '₦40,001 - ₦70,000', '₦70,001 - ₦100,000', '₦100,001 - ₦200,000', 'Above ₦200,000'].map((opt) => (
                  <label key={opt} className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name="q5_average_fee" value={opt} onChange={handleTextChange} className="h-4 w-4 text-gray-900" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 02: OPERATIONS */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">Current Operations [cite: 23]</h2>
            <div className="space-y-4">
              <label className="text-sm font-medium block">How do you currently manage student records? (Tick all that apply)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Paper files / exercise books', 'Microsoft Excel / Google Sheets', 'An existing school software', 'WhatsApp groups'].map((opt) => (
                  <label key={opt} className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" onChange={() => handleCheckboxArray('q7_manage_records', opt)} className="h-4 w-4 rounded border-gray-300 text-gray-900" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 04: FEATURE PRIORITY */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">Feature Priority [cite: 50]</h2>
            <p className="text-sm text-gray-600 mb-4">Rate each feature from 1 (Not needed) to 5 (Critical).</p>
            
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="p-4 border-b border-gray-200 font-medium">Finance Management</th>
                    {[1, 2, 3, 4, 5].map(n => <th key={n} className="p-4 border-b border-gray-200 text-center font-medium">{n}</th>)}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {[
                    { id: 'track_fees', label: 'Track which students have paid and who is owing' },
                    { id: 'auto_sms', label: 'Send automatic SMS reminders to parents' },
                    { id: 'generate_receipts', label: 'Generate and print official fee receipts' }
                  ].map((feat) => (
                    <tr key={feat.id} className="hover:bg-gray-50">
                      <td className="p-4 text-gray-800">{feat.label}</td>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <td key={num} className="p-4 text-center">
                          <input type="radio" name={`finance_${feat.id}`} value={num} onChange={() => handleFeatureRating('feature_finance', feat.id, num)} className="h-4 w-4 text-gray-900 cursor-pointer" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* SECTION 05: WILLINGNESS TO PAY */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">Willingness to Pay [cite: 93]</h2>
            <div className="space-y-4">
              <label className="text-sm font-medium block">If a software solved your top 3 administrative problems completely, how much would you pay per month?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {['Nothing', '₦5,000 - ₦10,000', '₦10,001 - ₦20,000', '₦20,001 - ₦35,000', '₦35,001 - ₦60,000', 'Above ₦60,000'].map((opt) => (
                  <label key={opt} className="flex items-center space-x-3 p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                    <input type="radio" name="q18_willing_to_pay" value={opt} onChange={handleTextChange} className="h-4 w-4 text-gray-900" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 06: OPEN FEEDBACK */}
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-2">Open Feedback [cite: 107]</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium block">In your own words, what is the single biggest problem Brainwave must solve to be useful to your school?</label>
              <textarea name="q24_biggest_problem" rows={4} onChange={handleTextChange} className="w-full p-3 border border-gray-300 rounded focus:ring-1 focus:ring-gray-900 outline-none resize-none"></textarea>
            </div>
          </section>

          <div className="pt-8 border-t border-gray-200">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-4 bg-gray-900 text-white font-medium rounded shadow-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Transmitting...' : 'Submit Research Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}