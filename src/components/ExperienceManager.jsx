import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Briefcase } from 'lucide-react';
import ResumeImport from './ResumeImport';
import SkillsManager from './SkillsManager';

export default function ExperienceManager() {
  const [activeTab, setActiveTab] = useState('experiences');
  const [experiences, setExperiences] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExperience, setNewExperience] = useState({
    company: '',
    job_title: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });
  const [responsibilities, setResponsibilities] = useState(['']);

  useEffect(() => {
    fetchExperiences();
  }, []);

  const fetchExperiences = async () => {
    const { data, error } = await supabase
      .from('experiences')
      .select(`
        *,
        responsibilities (*)
      `)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching experiences:', error);
    } else {
      setExperiences(data);
    }
  };

  const addExperience = async (e) => {
    e.preventDefault();
    
    const { data: expData, error: expError } = await supabase
      .from('experiences')
      .insert([newExperience])
      .select()
      .single();

    if (expError) {
      alert('Error adding experience: ' + expError.message);
      return;
    }

    const responsibilitiesToInsert = responsibilities
      .filter(r => r.trim())
      .map(r => ({
        experience_id: expData.id,
        description: r,
      }));

    if (responsibilitiesToInsert.length > 0) {
      const { error: respError } = await supabase
        .from('responsibilities')
        .insert(responsibilitiesToInsert);

      if (respError) {
        alert('Error adding responsibilities: ' + respError.message);
        return;
      }
    }

    setNewExperience({
      company: '',
      job_title: '',
      start_date: '',
      end_date: '',
      is_current: false,
    });
    setResponsibilities(['']);
    setShowAddForm(false);
    fetchExperiences();
  };

  const deleteExperience = async (id) => {
    if (!confirm('Delete this experience?')) return;

    const { error } = await supabase
      .from('experiences')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      fetchExperiences();
    }
  };

  return (
    <div className="mt-8">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('experiences')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'experiences'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Experiences
        </button>
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            activeTab === 'skills'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Skills
        </button>
      </div>

      {/* Content */}
      {activeTab === 'experiences' ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Work Experience</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Experience Manually
            </button>
          </div>

          <ResumeImport onImportComplete={fetchExperiences} />

          {showAddForm && (
            <form onSubmit={addExperience} className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Experience Manually</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    required
                    value={newExperience.company}
                    onChange={(e) => setNewExperience({...newExperience, company: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    required
                    value={newExperience.job_title}
                    onChange={(e) => setNewExperience({...newExperience, job_title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newExperience.start_date}
                    onChange={(e) => setNewExperience({...newExperience, start_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={newExperience.end_date}
                    onChange={(e) => setNewExperience({...newExperience, end_date: e.target.value})}
                    disabled={newExperience.is_current}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newExperience.is_current}
                    onChange={(e) => setNewExperience({...newExperience, is_current: e.target.checked, end_date: ''})}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Currently working here</span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsibilities</label>
                {responsibilities.map((resp, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <textarea
                      value={resp}
                      onChange={(e) => {
                        const newResp = [...responsibilities];
                        newResp[idx] = e.target.value;
                        setResponsibilities(newResp);
                      }}
                      placeholder="Describe a responsibility or achievement..."
                      rows={2}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    {responsibilities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setResponsibilities(responsibilities.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setResponsibilities([...responsibilities, ''])}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add Another Responsibility
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Save Experience
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {experiences.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No experiences yet</p>
                <p className="text-gray-400 text-sm">Import from your resume or add manually to get started!</p>
              </div>
            ) : (
              experiences.map((exp) => (
                <div key={exp.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-6 h-6 text-blue-600 mt-1" />
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{exp.job_title}</h3>
                        <p className="text-gray-600">{exp.company}</p>
                        <p className="text-sm text-gray-500">
                          {exp.start_date || 'N/A'} - {exp.is_current ? 'Present' : (exp.end_date || 'N/A')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteExperience(exp.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Responsibilities:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {exp.responsibilities.map((resp) => (
                          <li key={resp.id} className="ml-2">{resp.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <SkillsManager />
      )}
    </div>
  );
}