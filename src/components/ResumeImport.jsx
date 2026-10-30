import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { trackUsage } from '../lib/trackUsage';

export default function ResumeImport({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions';

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess(false);

    try {
      // Step 1: Extract text from PDF
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const extractResponse = await fetch(`${API_BASE}/extract-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfData: base64Data })
      });

      const extractData = await extractResponse.json();
      if (extractData.error) throw new Error(extractData.error);
      
      const resumeText = extractData.content[0].text;

      // Step 2: Parse resume with AI
      const parseResponse = await fetch(`${API_BASE}/parse-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText })
      });

      const parseData = await parseResponse.json();
      if (parseData.error) throw new Error(parseData.error);

      // Extract parsed experiences from AI response
      let parsedContent = parseData.content[0].text;
      
      // Remove markdown code blocks if present
      parsedContent = parsedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const experiences = JSON.parse(parsedContent);

      // Step 3: Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 4: Insert experiences into database
      for (const exp of experiences) {
        const { data: expData, error: expError } = await supabase
          .from('experiences')
          .insert([{
            user_id: user.id,
            company: exp.company,
            job_title: exp.job_title,
            start_date: exp.start_date || null,
            end_date: exp.end_date || null,
            is_current: exp.is_current || false
          }])
          .select()
          .single();

        if (expError) throw expError;

        // Insert responsibilities
        if (exp.responsibilities && exp.responsibilities.length > 0) {
          const responsibilities = exp.responsibilities.map(desc => ({
            experience_id: expData.id,
            description: desc
          }));

          const { error: respError } = await supabase
            .from('responsibilities')
            .insert(responsibilities);

          if (respError) throw respError;
        }
      }

      setSuccess(true);
      setFile(null);

      // Track usage
      await trackUsage('import_resume', {
        experiences_imported: experiences.length
      });

      setTimeout(() => {
        onImportComplete();
      }, 1500);

    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import resume');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Upload className="w-5 h-5 text-blue-600" />
        Quick Import from Resume
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload your resume and we'll automatically extract all your experiences
      </p>

      <form onSubmit={handleImport} className="space-y-4">
        <div>
          <label className="block">
            <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
              file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}>
              <Upload className={`w-10 h-10 mx-auto mb-2 ${file ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className="text-sm text-gray-600">
                {file ? file.name : 'Click to upload resume PDF'}
              </p>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setError('');
                  setSuccess(false);
                }}
              />
            </div>
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded">
            <CheckCircle className="w-4 h-4" />
            Resume imported successfully! Refreshing...
          </div>
        )}

        <button
          type="submit"
          disabled={!file || importing || success}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import Experiences
            </>
          )}
        </button>
      </form>
    </div>
  );
}