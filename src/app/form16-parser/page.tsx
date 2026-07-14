'use client';

import React, { useState } from 'react';
import { extractTextFromPDF } from '@/lib/form16/extractor';
import { parseForm16Text } from '@/lib/form16/parser';
import { validateForm16Data } from '@/lib/itr/validator';
import { mapForm16ToITR1 } from '@/lib/itr/mapper';
import { Form16Data, ITR1_JSON } from '@/lib/types';

export default function Form16ParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<Form16Data | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const text = await extractTextFromPDF(arrayBuffer);
      setRawText(text);
      const parsed = parseForm16Text(text);
      setExtractedData(parsed);
      setErrors(validateForm16Data(parsed));
    } catch (err) {
      console.error('Error processing PDF:', err);
      alert('Failed to process PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Form-16 to ITR JSON Parser</h1>

      {/* Upload Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">1. Upload Form-16 PDF</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {loading && <p className="mt-4 text-blue-600 animate-pulse">Extracting data... Please wait.</p>}
      </div>

      {extractedData && (
        <>
          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg mb-8 border border-red-200">
              <h3 className="text-red-700 font-bold mb-2">Validation Warnings:</h3>
              <ul className="list-disc ml-5 text-red-600 text-sm">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {/* Review & Edit Section */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-gray-200">
            <h2 className="text-xl font-semibold mb-6 text-gray-700">2. Review & Edit Extracted Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2 text-gray-800">Assessee Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Employee PAN</label>
                  <input
                    type="text"
                    value={extractedData.employee.pan}
                    onChange={(e) => setExtractedData({...extractedData, employee: {...extractedData.employee, pan: e.target.value}})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">First Name</label>
                  <input
                    type="text"
                    value={extractedData.employee.name.firstName}
                    onChange={(e) => setExtractedData({...extractedData, employee: {...extractedData.employee, name: {...extractedData.employee.name, firstName: e.target.value}}})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Last Name</label>
                  <input
                    type="text"
                    value={extractedData.employee.name.lastName}
                    onChange={(e) => setExtractedData({...extractedData, employee: {...extractedData.employee, name: {...extractedData.employee.name, lastName: e.target.value}}})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                  />
                </div>
              </div>

              {/* Salary Details */}
              <div className="space-y-4">
                <h3 className="font-bold border-b pb-2 text-gray-800">Salary Income (₹)</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Gross Salary</label>
                  <input
                    type="number"
                    value={extractedData.salary.grossSalary}
                    onChange={(e) => setExtractedData({...extractedData, salary: {...extractedData.salary, grossSalary: parseFloat(e.target.value) || 0}})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Standard Deduction (u/s 16ia)</label>
                  <input
                    type="number"
                    value={extractedData.salary.standardDeduction16ia}
                    onChange={(e) => setExtractedData({...extractedData, salary: {...extractedData.salary, standardDeduction16ia: parseFloat(e.target.value) || 0}})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                  />
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold border-b pb-2 text-gray-800">Chapter VI-A Deductions (₹)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Section 80C</label>
                    <input
                      type="number"
                      value={extractedData.deductions80C}
                      onChange={(e) => setExtractedData({...extractedData, deductions80C: parseFloat(e.target.value) || 0})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Section 80D</label>
                    <input
                      type="number"
                      value={extractedData.deductions80D}
                      onChange={(e) => setExtractedData({...extractedData, deductions80D: parseFloat(e.target.value) || 0})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Section 80TTA</label>
                    <input
                      type="number"
                      value={extractedData.deductions80TTA}
                      onChange={(e) => setExtractedData({...extractedData, deductions80TTA: parseFloat(e.target.value) || 0})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 p-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setErrors(validateForm16Data(extractedData))}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition shadow-sm font-medium"
              >
                Re-validate Data
              </button>
              <button
                onClick={() => {
                  const itrJson = mapForm16ToITR1(extractedData);
                  const blob = new Blob([JSON.stringify(itrJson, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ITR1_${extractedData.employee.pan || 'data'}.json`;
                  a.click();
                }}
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition shadow-sm font-medium"
              >
                Download ITR JSON
              </button>
            </div>
          </div>

          {/* Debug Information */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4 text-gray-600">3. Debug Information (For Verification)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                <h4 className="font-bold mb-2 border-b border-gray-700 pb-1">Raw Extracted Text</h4>
                <pre className="whitespace-pre-wrap">{rawText}</pre>
              </div>
              <div className="bg-gray-900 text-blue-400 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                <h4 className="font-bold mb-2 border-b border-gray-700 pb-1">Intermediate Form16Data Object</h4>
                <pre>{JSON.stringify(extractedData, null, 2)}</pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
