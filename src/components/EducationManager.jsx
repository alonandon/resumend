import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, GraduationCap, Edit } from 'lucide-react';

export default function EducationManager({ darkMode = false }) {
  const [education, setEducation] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    gpa: '',
    location: '',
    honors: ''
  });

  useEffect(() => {
    fetchEducation();
  }, []);

  const fetchEducation = async () => {
    const { data, error } = await supabase
      .from('education')
      .select('*')
      .order('end_date', { ascending: false });

    if (error) {
      console.error('Error fetching education:', error);
    } else {
      setEducation(data);
    }
  };

  const addEducation = async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to add education');
      return;
    }

    const educationData = {
      ...newEducation,
      user_id: user.id,
      start_date: newEducation.start_date || null,
      end_date: newEducation.end_date || null,
    };
    
    const { error } = await supabase
      .from('education')
      .insert([educationData]);

    if (error) {
      alert('Error adding education: ' + error.message);
      return;
    }

    resetForm();
    fetchEducation();
  };

  const updateEducation = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('education')
      .update({
        institution: newEducation.institution,
        degree: newEducation.degree,
        field_of_study: newEducation.field_of_study,
        start_date: newEducation.start_date || null,
        end_date: newEducation.end_date || null,
        gpa: newEducation.gpa,
        location: newEducation.location,
        honors: newEducation.honors
      })
      .eq('id', editingId);

    if (error) {
      alert('Error updating education: ' + error.message);
      return;
    }

    resetForm();
    fetchEducation();
  };

  const deleteEducation = async (id) => {
    if (!confirm('Delete this education entry?')) return;

    const { error } = await supabase
      .from('education')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      fetchEducation();
    }
  };

  const startEdit = (edu) => {
    setEditingId(edu.id);
    setNewEducation({
      institution: edu.institution,
      degree: edu.degree,
      field_of_study: edu.field_of_study || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || '',
      gpa: edu.gpa || '',
      location: edu.location || '',
      honors: edu.honors || ''
    });
    setShowAddForm(false);
  };

  const resetForm = () => {
    setNewEducation({
      institution: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
      gpa: '',
      location: '',
      honors: ''
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  return (
    <div className={`rounded-lg shadow-md p-6 mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Education</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Education
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <form onSubmit={editingId ? updateEducation : addEducation} className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {editingId ? 'Edit Education' : 'Add Education'}
          </h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Institution *</label>
              <input
                type="text"
                required
                value={newEducation.institution}
                onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})}
                placeholder="Harvard University"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Degree *</label>
              <input
                type="text"
                required
                value={newEducation.degree}
                onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})}
                placeholder="Bachelor of Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
              <input
                type="text"
                value={newEducation.field_of_study}
                onChange={(e) => setNewEducation({...newEducation, field_of_study: e.target.value})}
                placeholder="Computer Science"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={newEducation.location}
                onChange={(e) => setNewEducation({...newEducation, location: e.target.value})}
                placeholder="Cambridge, MA"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={newEducation.start_date}
                onChange={(e) => setNewEducation({...newEducation, start_date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date (or Expected)</label>
              <input
                type="date"
                value={newEducation.end_date}
                onChange={(e) => setNewEducation({...newEducation, end_date: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
              <input
                type="text"
                value={newEducation.gpa}
                onChange={(e) => setNewEducation({...newEducation, gpa: e.target.value})}
                placeholder="3.8/4.0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Honors/Awards</label>
              <input
                type="text"
                value={newEducation.honors}
                onChange={(e) => setNewEducation({...newEducation, honors: e.target.value})}
                placeholder="Magna Cum Laude, Dean's List"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Education List */}
      <div className="space-y-4">
        {education.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No education entries yet</p>
            <p className="text-gray-400 text-sm">Add your educational background</p>
          </div>
        ) : (
          education.map((edu) => (
            <div key={edu.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{edu.institution}</h3>
                    <p className="text-gray-700 font-medium">
                      {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    </p>
                    {edu.location && <p className="text-sm text-gray-600">{edu.location}</p>}
                    <p className="text-sm text-gray-500">
                      {edu.start_date ? new Date(edu.start_date).getFullYear() : 'N/A'} - {edu.end_date ? new Date(edu.end_date).getFullYear() : 'Present'}
                    </p>
                    {edu.gpa && <p className="text-sm text-gray-600 mt-1">GPA: {edu.gpa}</p>}
                    {edu.honors && <p className="text-sm text-gray-600 italic mt-1">{edu.honors}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(edu)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit education"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteEducation(edu.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete education"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}