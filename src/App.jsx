import React, { useState } from 'react';
import { Upload, FileText, Briefcase, Loader2, CheckCircle, AlertCircle, Key, Copy, Check, Mail } from 'lucide-react';

export default function ResumeOptimizer() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeTextManual, setResumeTextManual] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTextManual, setJobTextManual] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copiedSections, setCopiedSections] = useState({});

  // Determine if we're running locally or on Netlify
  const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8888/.netlify/functions'
    : '/.netlify/functions';

  const copyToClipboard = async (text, sectionId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSections(prev => ({ ...prev, [sectionId]: true }));
      setTimeout(() => {
        setCopiedSections(prev => ({ ...prev, [sectionId]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const extractTextFromPDF = async (file) => {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      
      console.log('Calling extract-pdf function...');
      
      const response = await fetch(`${API_BASE}/extract-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfData: base64Data
        })
      });

      const data = await response.json();
      
      console.log('Function response:', data);
      
      if (data.error) {
        throw new Error(data.error.message || data.error);
      }
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('No text content returned from API');
      }
      
      return data.content[0].text;
    } catch (err) {
      console.error('PDF extraction error:', err);
      throw new Error(`PDF extraction failed: ${err.message}`);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError('');
      setProcessing(true);
      try {
        const text = await extractTextFromPDF(file);
        setResumeText(text);
        setProcessing(false);
      } catch (err) {
        setError(`Failed to read resume PDF: ${err.message}`);
        setResumeFile(null);
        setProcessing(false);
      }
    } else {
      setError('Please upload a PDF file');
    }
  };

  const fetchJobPosting = async () => {
    if (!jobUrl) return;
    
    setError('');
    setProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE}/fetch-job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: jobUrl
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API error');
      }
      
      let extractedText = '';
      
      for (const block of data.content) {
        if (block.type === 'text') {
          extractedText += block.text + '\n';
        }
      }
      
      if (!extractedText.trim()) {
        throw new Error('No content extracted from URL. Try pasting the job description manually.');
      }
      
      setJobText(extractedText);
    } catch (err) {
      setError(`Failed to fetch job posting: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const analyzeResume = async () => {
    const finalJobText = jobText || jobTextManual;
    const finalResumeText = resumeText || resumeTextManual;
    
    if (!finalResumeText) {
      setError('Please upload a resume PDF or paste your resume text.');
      return;
    }
    
    if (!finalJobText) {
      setError('Please provide a job posting (either fetch from URL or paste text)');
      return;
    }

    setProcessing(true);
    setError('');
    setResults(null);

    try {
      // Analyze resume against job posting
      const analysisResponse = await fetch(`${API_BASE}/analyze-resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeText: finalResumeText,
          jobText: finalJobText
        })
      });

      const analysisData = await analysisResponse.json();
      
      if (analysisData.error) {
        throw new Error(analysisData.error);
      }
      
      const analysis = analysisData.content[0].text;

      setResults(analysis);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">ResuMend</h1>
          <p className="text-gray-600">AI-powered resume tailoring for your dream job</p>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Upload your resume PDF or paste your resume text</li>
            <li>Either paste a job posting URL and click "Fetch", OR paste the job description text directly</li>
            <li>Click "Optimize Resume" to get AI-powered recommendations</li>
            <li>Review keyword alignments, content improvements, and ready-to-copy bullet points</li>
            <li>Use the copy buttons to grab optimized text for your resume</li>
          </ol>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Resume Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Your Resume</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option 1: Upload PDF
                </label>
                <label className="block">
                  <div className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    resumeFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-500'
                  }`}>
                    <Upload className={`w-12 h-12 mx-auto mb-3 ${resumeFile ? 'text-green-600' : 'text-gray-400'}`} />
                    <p className="text-sm text-gray-600 mb-2">
                      {resumeFile ? resumeFile.name : 'Click to upload resume PDF'}
                    </p>
                    {resumeFile && resumeText && (
                      <div className="flex items-center justify-center text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Uploaded & extracted successfully
                      </div>
                    )}
                    {resumeFile && !resumeText && (
                      <div className="flex items-center justify-center text-yellow-600 text-sm">
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Extracting text...
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleResumeUpload}
                    />
                  </div>
                </label>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option 2: Paste Resume Text
                </label>
                <textarea
                  value={resumeTextManual}
                  onChange={(e) => setResumeTextManual(e.target.value)}
                  placeholder="Paste your resume text here..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                />
              </div>
              
              {(resumeText || resumeTextManual) && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Resume ready
                </div>
              )}
            </div>
          </div>

          {/* Job Posting URL */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Briefcase className="w-6 h-6 text-indigo-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Job Posting</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option 1: Job Posting URL
                </label>
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://example.com/job-posting"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <button
                  onClick={fetchJobPosting}
                  disabled={!jobUrl || processing}
                  className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing && !results ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </span>
                  ) : (
                    'Fetch Job Posting'
                  )}
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">OR</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Option 2: Paste Job Description
                </label>
                <textarea
                  value={jobTextManual}
                  onChange={(e) => setJobTextManual(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition resize-none"
                />
              </div>
              
              {(jobText || jobTextManual) && (
                <div className="flex items-center text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Job posting ready
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="text-center mb-8">
          <button
            onClick={analyzeResume}
            disabled={(!resumeText && !resumeTextManual) || (!jobText && !jobTextManual) || processing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Optimize Resume'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-4 rounded-t-lg -mx-8 -mt-8 mb-8">
              <h2 className="text-2xl font-bold">Optimization Recommendations</h2>
            </div>
            
            <div className="space-y-8">
              {results.split(/(?=#{1,2}\s)/).filter(s => s.trim()).map((section, idx) => {
                const lines = section.split('\n').filter(l => l.trim());
                const headerLine = lines[0];
                const isMainHeader = headerLine.startsWith('# ');
                const isSubHeader = headerLine.startsWith('## ');
                
                if (isMainHeader || isSubHeader) {
                  const headerText = headerLine.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
                  const contentLines = lines.slice(1);
                  const sectionId = `section-${idx}`;
                  
                  // Check if this is the bullet points section
                  const isBulletPointsSection = headerText.toLowerCase().includes('bullet point') || 
                                                 headerText.toLowerCase().includes('ready-to-use');
                  
                  // Extract all bullet points for this section
                  const bulletPoints = contentLines
                    .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'))
                    .map(line => line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '').trim())
                    .join('\n');
                  
                  return (
                    <div key={idx} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-blue-400">
                        <h3 className="text-xl font-bold text-blue-600">
                          {headerText}
                        </h3>
                        {isBulletPointsSection && bulletPoints && (
                          <button
                            onClick={() => copyToClipboard(bulletPoints, sectionId)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                          >
                            {copiedSections[sectionId] ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy All
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {contentLines.map((line, lineIdx) => {
                          const trimmed = line.trim();
                          
                          // Bold subheaders
                          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                            const subSectionId = `${sectionId}-sub-${lineIdx}`;
                            // Get bullet points under this subheader
                            let subBulletPoints = [];
                            for (let i = lineIdx + 1; i < contentLines.length; i++) {
                              const nextLine = contentLines[i].trim();
                              if (nextLine.startsWith('**') && nextLine.endsWith('**')) break;
                              if (nextLine.startsWith('*') || nextLine.startsWith('-')) {
                                subBulletPoints.push(nextLine.replace(/^[*-]\s*/, '').replace(/\*\*/g, '').trim());
                              }
                            }
                            
                            return (
                              <div key={lineIdx} className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-bold text-gray-900 text-base">
                                    {trimmed.replace(/\*\*/g, '')}
                                  </p>
                                  {isBulletPointsSection && subBulletPoints.length > 0 && (
                                    <button
                                      onClick={() => copyToClipboard(subBulletPoints.join('\n'), subSectionId)}
                                      className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-xs font-medium"
                                    >
                                      {copiedSections[subSectionId] ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          Copy
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          // Bullet points
                          if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                            return (
                              <div key={lineIdx} className="flex items-start ml-2">
                                <span className="text-blue-500 mr-3 mt-1">•</span>
                                <span className="text-gray-700 flex-1">
                                  {trimmed.replace(/^[*-]\s*/, '').replace(/\*\*/g, '')}
                                </span>
                              </div>
                            );
                          }
                          
                          // Regular text
                          if (trimmed) {
                            return (
                              <p key={lineIdx} className="text-gray-700 leading-relaxed">
                                {trimmed.replace(/\*\*/g, '')}
                              </p>
                            );
                          }
                          
                          return null;
                        })}
                      </div>
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-300 flex justify-center">
              <button
                onClick={() => {
                  setResults(null);
                  setResumeText('');
                  setResumeTextManual('');
                  setResumeFile(null);
                  setJobText('');
                  setJobTextManual('');
                  setJobUrl('');
                  setCopiedSections({});
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition"
              >
                Start New Analysis
              </button>
            </div>
          </div>
        )}

        {/* Instructions removed - moved to top */}

        {/* Contact Box */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 rounded-full p-3">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Have Suggestions?</h3>
              <p className="text-gray-600 mb-3">
                We'd love to hear your feedback and ideas to improve ResuMend! 
              </p>
              <a 
                href="mailto:resumendapp@gmail.com?subject=ResuMend Suggestion"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Mail className="w-4 h-4" />
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}