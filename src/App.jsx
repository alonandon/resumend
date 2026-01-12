import React, { useState, useEffect } from 'react';
import { Upload, FileText, Briefcase, Loader2, CheckCircle, AlertCircle, Key, Copy, Check, Mail, Info, User, Settings, LogOut, Download } from 'lucide-react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import ExperienceManager from './components/ExperienceManager';
import { trackUsage } from './lib/trackUsage';
import { generateHarvardResumePDF } from './lib/generateHarvardResume';

console.log('Imports successful');
console.log('Supabase:', supabase);
console.log('Auth component:', Auth);

// Test Supabase connection
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase client:', supabase);

export default function ResumeOptimizer() {
  console.log('ResumeOptimizer component rendering');
  const [session, setSession] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeTextManual, setResumeTextManual] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobTextManual, setJobTextManual] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [jobText, setJobText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [copiedSections, setCopiedSections] = useState({});
  const [showSuggestionBox, setShowSuggestionBox] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [currentView, setCurrentView] = useState('optimizer');
  const [showInfo, setShowInfo] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [useAllExperiences, setUseAllExperiences] = useState(false);
  const [optimizedBullets, setOptimizedBullets] = useState(null);
  const [generatingResume, setGeneratingResume] = useState(false);

  // Helper function to parse AI-generated bullets from results
  const parseOptimizedBullets = (resultsText) => {
    if (!resultsText) return null;
    
    console.log('=== PARSING OPTIMIZED BULLETS ===');
    console.log('Results text length:', resultsText.length);
    console.log('First 500 chars:', resultsText.substring(0, 500));
    
    const bulletMap = {};
    const allBullets = [];
    
    // Split by markdown headers
    const sections = resultsText.split(/(?=#{1,3}\s)/);
    console.log('Found sections:', sections.length);
    
    let inBulletPointsSection = false;
    
    sections.forEach((section, sectionIdx) => {
      const lines = section.split('\n').filter(l => l.trim());
      if (lines.length === 0) return;
      
      const header = lines[0].toLowerCase();
      console.log(`\nSection ${sectionIdx} header:`, header.substring(0, 100));
      
      // Check if this is the main "optimized bullet points" section
      const isBulletSectionHeader = 
        (header.includes('bullet') && header.includes('point')) ||
        header.includes('ready-to-use');
      
      if (isBulletSectionHeader) {
        console.log('✓ Entering bullet points section!');
        inBulletPointsSection = true;
        return; // Continue to next section to get the actual bullets
      }
      
      // Check if we've left the bullet points section (moved to next main section like "skills" or "recommendations")
      if (inBulletPointsSection && 
          (header.includes('5.') || header.includes('skill') || 
           header.includes('6.') || header.includes('recommendation') ||
           header.includes('7.'))) {
        console.log('✗ Leaving bullet points section');
        inBulletPointsSection = false;
        return;
      }
      
      // If we're in the bullet points section, collect bullets from all subsections
      if (inBulletPointsSection) {
        console.log(`  → Processing subsection for bullets`);
        
        // Extract all bullet points from this subsection
        let bulletCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check if line is a bullet (starts with *, -, •, or is numbered like "1. ")
          if (line.match(/^[*\-•]\s+/) || line.match(/^\d+\.\s+/)) {
            // Clean up the bullet point
            const cleanedBullet = line
              .replace(/^[*\-•]\s*/, '')  // Remove bullet markers
              .replace(/^\d+\.\s*/, '')    // Remove numbers
              .replace(/\*\*/g, '')        // Remove bold markers
              .trim();
            
            // Only include substantial bullets (more than 20 chars)
            if (cleanedBullet && cleanedBullet.length > 20) {
              allBullets.push(cleanedBullet);
              bulletCount++;
              console.log(`    ✓ Added bullet ${bulletCount} (${cleanedBullet.length} chars):`, cleanedBullet.substring(0, 60) + '...');
            }
          }
        }
        
        if (bulletCount === 0) {
          console.log(`    ✗ No bullets found in this subsection`);
        }
      }
    });
    
    // Store all collected bullets
    if (allBullets.length > 0) {
      bulletMap['optimized'] = allBullets;
      console.log(`\n✓ SUCCESS: Stored ${allBullets.length} total bullets`);
      console.log('First 2 bullets:', allBullets.slice(0, 2));
    } else {
      console.log('\n✗ FAILED: No bullets found');
      console.log('This might mean:');
      console.log('1. Bullets are not in the expected format');
      console.log('2. No subsections were found under "4. optimized bullet points"');
      console.log('3. Need to see actual content - check results on screen');
    }
    
    const result = Object.keys(bulletMap).length > 0 ? bulletMap : null;
    console.log('Final result:', result ? `${allBullets.length} bullets found` : 'null');
    return result;
  };

  const handleGenerateResume = async () => {
    if (!session) {
      alert('Please sign in to generate your resume. Click "Sign up for Experience Library" above to create an account.');
      return;
    }

    if (!results) {
      alert('Please run the Resume Optimizer first to generate recommendations.');
      return;
    }

    setGeneratingResume(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Parse bullets from results RIGHT NOW when generating
      console.log('=== GENERATING RESUME ===');
      console.log('Parsing bullets from results...');
      const parsedBullets = parseOptimizedBullets(results);
      console.log('Parsed bullets for resume:', parsedBullets);
      
      if (!parsedBullets) {
        alert('Could not find optimized bullet points in the recommendations. Please make sure the optimization completed successfully.');
        setGeneratingResume(false);
        return;
      }
      
      // Fetch all data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        alert('Please complete your profile information first. Go to Experience Library > Profile tab to add your details.');
        setGeneratingResume(false);
        return;
      }

      const { data: education } = await supabase
        .from('education')
        .select('*')
        .order('end_date', { ascending: false });

      const { data: experiences } = await supabase
        .from('experiences')
        .select(`
          *,
          responsibilities (*)
        `)
        .order('start_date', { ascending: false });

      const { data: skills } = await supabase
        .from('skills')
        .select('*');

      console.log('Generating PDF with data:', {
        profile: profile?.full_name,
        education: education?.length,
        experiences: experiences?.length,
        skills: skills?.length,
        bullets: parsedBullets
      });

      // Generate PDF with optimized bullets parsed from results
      await generateHarvardResumePDF(
        profile, 
        education || [], 
        experiences || [], 
        skills || [],
        parsedBullets
      );
      
      // Track usage
      await trackUsage(user.id, 'resume_generated');
      
      alert('Resume generated successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Error generating resume:', error);
      alert(`Failed to generate resume: ${error.message}`);
    } finally {
      setGeneratingResume(false);
    }
  };

  // Check for existing session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Guest mode: allow optimizer without login, but require login for experiences
  if (!session && currentView === 'experiences') {
    return <Auth />;
  }

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

  const sendSuggestion = () => {
    if (!suggestion.trim()) {
      alert('Please enter a suggestion first!');
      return;
    }

    const subject = encodeURIComponent('ResuMend Suggestion');
    const body = encodeURIComponent(suggestion);
    window.location.href = `mailto:resumendapp@gmail.com?subject=${subject}&body=${body}`;
    
    setSuggestionSent(true);
    setTimeout(() => {
      setSuggestionSent(false);
      setShowSuggestionBox(false);
      setSuggestion('');
    }, 2000);
  };

  const extractTextFromPDF = async (file) => {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      
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
    
    if (!finalJobText) {
      setError('Please provide a job posting (either fetch from URL or paste text)');
      return;
    }

    // If using all experiences, require login
    if (useAllExperiences && !session) {
      setError('Please sign in to use your saved experiences');
      return;
    }

    // If not using all experiences, require resume
    if (!useAllExperiences && !finalResumeText) {
      setError('Please upload a resume PDF or paste your resume text.');
      return;
    }

    setProcessing(true);
    setError('');
    setResults(null);
    setProcessingProgress('Preparing your data...');

    try {
      if (useAllExperiences) {
        setProcessingProgress('Fetching your experiences and skills...');
        
        // Fetch user's experiences and skills
        const { data: experiencesData, error: expError } = await supabase
          .from('experiences')
          .select(`
            *,
            responsibilities (*)
          `)
          .order('start_date', { ascending: false });

        if (expError) throw expError;

        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('*');

        if (skillsError) throw skillsError;

        setProcessingProgress('Analyzing job posting requirements...');
        
        // Use optimize-with-experiences function
        console.log('=== SENDING TO OPTIMIZER ===');
        console.log('Job text being sent:', finalJobText ? `${finalJobText.substring(0, 100)}...` : 'EMPTY');
        console.log('Job text length:', finalJobText?.length || 0);
        console.log('Experiences count:', experiencesData?.length);
        console.log('Skills count:', skillsData?.length);
        
        // Simulate progress updates
        setTimeout(() => setProcessingProgress('Matching your experience to job requirements...'), 3000);
        setTimeout(() => setProcessingProgress('Generating optimized bullet points...'), 8000);
        setTimeout(() => setProcessingProgress('Finalizing recommendations...'), 15000);
        
        const analysisResponse = await fetch(`${API_BASE}/optimize-with-experiences`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            experiences: experiencesData,
            skills: skillsData,
            jobText: finalJobText
          })
        });

        const analysisData = await analysisResponse.json();
        
        if (analysisData.error) {
          throw new Error(analysisData.error);
        }
        
        const analysis = analysisData.content[0].text;
        setResults(analysis);
        setProcessingProgress('');

        // Parse and store optimized bullets
        const parsedBullets = parseOptimizedBullets(analysis);
        setOptimizedBullets(parsedBullets);

        // Track usage
        await trackUsage('optimize_resume_with_experiences', {
          job_title: finalJobText.substring(0, 100),
          experiences_count: experiencesData?.length || 0,
          skills_count: skillsData?.length || 0
        });

      } else {
        setProcessingProgress('Analyzing your resume...');
        setTimeout(() => setProcessingProgress('Comparing to job requirements...'), 2000);
        setTimeout(() => setProcessingProgress('Generating recommendations...'), 5000);
        
        // Original analyze-resume function
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
        setProcessingProgress('');

        // Parse and store optimized bullets
        const parsedBullets = parseOptimizedBullets(analysis);
        setOptimizedBullets(parsedBullets);

        // Track usage
        await trackUsage('optimize_resume', {
          job_title: finalJobText.substring(0, 100),
          used_pdf: !!resumeFile
        });
      }

    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      setProcessingProgress('');
    } finally {
      setProcessing(false);
      setProcessingProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">ResuMend</h1>
          <p className="text-gray-600">AI-powered resume tailoring for your dream job</p>
          
          {session && (
            <div className="flex justify-center mt-4">
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition border border-gray-200"
                >
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{session.user.email?.split('@')[0]}</span>
                </button>
                
                {showProfileMenu && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-20">
                    <div className="p-4 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">{session.user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">Free Plan</p>
                    </div>
                    
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          alert('Settings coming soon! Features planned:\n- Dark mode\n- Language preferences\n- Analysis speed options');
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                      >
                        <Settings className="w-4 h-4" />
                        Settings (Coming Soon)
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          supabase.auth.signOut();
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!session && (
            <button
              onClick={() => setCurrentView('experiences')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Sign up for Experience Library
            </button>
          )}
        </div>

        <div className="flex gap-4 justify-center mt-4">
          <div className="relative">
            <button
              onClick={() => setCurrentView('optimizer')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                currentView === 'optimizer' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Resume Optimizer
              <Info 
                className="w-4 h-4 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInfo(currentView === 'optimizer' ? !showInfo : true);
                  setCurrentView('optimizer');
                }}
              />
            </button>
            
            {showInfo && currentView === 'optimizer' && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-80 z-10">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">How to use Resume Optimizer:</h4>
                  <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Upload your resume PDF or paste your resume text</li>
                  <li>Paste a job posting URL or the full job description</li>
                  <li>Click "Optimize Resume" to get AI recommendations</li>
                  <li>Review keyword alignments and improvements</li>
                  <li>Use copy buttons to grab optimized bullet points</li>
                  <li>Click "Generate Resume PDF" to create your formatted resume</li>
                </ol>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={() => {
                if (!session) {
                  if (confirm('You need to create an account to use the Experience Library. Sign up now?')) {
                    setCurrentView('experiences');
                  }
                } else {
                  setCurrentView('experiences');
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                currentView === 'experiences' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Experience Library {!session && <span className="text-xs">(Sign up required)</span>}
              <Info 
                className="w-4 h-4 cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (session) {
                    setShowInfo(currentView === 'experiences' ? !showInfo : true);
                  }
                }}
              />
            </button>
            
            {showInfo && currentView === 'experiences' && session && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-80 z-10">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">How to use Experience Library:</h4>
                  <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Add all your work experiences and responsibilities</li>
                  <li>Store everything - even items that don't fit on a standard resume</li>
                  <li>The AI will select the most relevant experiences for each job</li>
                  <li>Get personalized resume suggestions based on your full history</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {currentView === 'optimizer' ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-8 mt-8">
              {/* Resume Upload */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-800">Your Resume</h2>
                </div>
                {useAllExperiences ? (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 text-center">
                    <p className="text-purple-800 font-medium">Using your saved experiences</p>
                    <p className="text-sm text-purple-600 mt-1">Resume upload not needed</p>
                  </div>
                ) : (
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
                )}
              </div>

              {/* Job Posting */}
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
              {session && (
                <div className="mb-4">
                  <label className="inline-flex items-center gap-3 bg-purple-50 border-2 border-purple-200 rounded-lg px-6 py-3 cursor-pointer hover:bg-purple-100 transition">
                    <input
                      type="checkbox"
                      checked={useAllExperiences}
                      onChange={(e) => {
                        setUseAllExperiences(e.target.checked);
                        if (e.target.checked) {
                          // Clear resume inputs when using experiences
                          setResumeText('');
                          setResumeTextManual('');
                          setResumeFile(null);
                        }
                      }}
                      className="w-5 h-5 text-purple-600"
                    />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">Use All My Saved Experiences</p>
                      <p className="text-sm text-gray-600">AI will select the best experiences and craft optimized bullets for this job</p>
                    </div>
                  </label>
                </div>
              )}
              
              <button
                onClick={analyzeResume}
                disabled={
                  (useAllExperiences ? !session : (!resumeText && !resumeTextManual)) || 
                  (!jobText && !jobTextManual) || 
                  processing
                }
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <span className="flex flex-col items-center">
                    <span className="flex items-center mb-1">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {useAllExperiences ? 'Analyzing Your Experiences...' : 'Analyzing...'}
                    </span>
                    {processingProgress && (
                      <span className="text-sm text-blue-100">{processingProgress}</span>
                    )}
                  </span>
                ) : (
                  useAllExperiences ? 'Optimize With My Experiences' : 'Optimize Resume'
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

            {/* Generate Resume Button - Only show when using saved experiences and optimization is complete */}
            {results && useAllExperiences && session && (
              <div className="mb-6 rounded-lg shadow-lg p-6 bg-gradient-to-r from-green-500 to-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      Step 2: Generate Your Resume!
                    </h3>
                    <p className="text-white text-sm">
                      Review the recommendations above, then click below to generate a professional PDF resume with these AI-optimized bullet points.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateResume}
                    disabled={generatingResume}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-md whitespace-nowrap transition ${
                      generatingResume
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-white text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {generatingResume ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Generate Resume PDF
                      </>
                    )}
                  </button>
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
                      
                      const isBulletPointsSection = headerText.toLowerCase().includes('bullet point') || 
                                                     headerText.toLowerCase().includes('ready-to-use');
                      
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
                              
                              if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                const subSectionId = `${sectionId}-sub-${lineIdx}`;
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
                      setOptimizedBullets(null);
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

            {/* Contact Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 border-2 border-blue-200 mt-8">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 rounded-full p-3">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Have Suggestions?</h3>
                  <p className="text-gray-600 mb-3">
                    We'd love to hear your feedback and ideas to improve ResuMend! 
                  </p>
                  
                  {!showSuggestionBox ? (
                    <button
                      onClick={() => setShowSuggestionBox(true)}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Have any ideas? Tell us here!
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={suggestion}
                        onChange={(e) => setSuggestion(e.target.value)}
                        placeholder="Share your ideas, feedback, or suggestions..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={sendSuggestion}
                          disabled={suggestionSent}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                        >
                          {suggestionSent ? (
                            <>
                              <Check className="w-4 h-4" />
                              Sent!
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Send Suggestion
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowSuggestionBox(false);
                            setSuggestion('');
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <ExperienceManager />
        )}
      </div>
    </div>
  );
}