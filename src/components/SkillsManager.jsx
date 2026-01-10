import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Tag } from 'lucide-react';

export default function SkillsManager() {
  const [skills, setSkills] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    category: 'Technical',
    proficiency_level: 'Intermediate'
  });

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching skills:', error);
    } else {
      setSkills(data);
    }
  };

  const addSkill = async (e) => {
    e.preventDefault();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to add skills');
      return;
    }

    // Add user_id to skill data
    const skillData = {
      ...newSkill,
      user_id: user.id
    };
    
    const { error } = await supabase
      .from('skills')
      .insert([skillData]);

    if (error) {
      alert('Error adding skill: ' + error.message);
      return;
    }

    setNewSkill({
      skill_name: '',
      category: 'Technical',
      proficiency_level: 'Intermediate'
    });
    setShowAddForm(false);
    fetchSkills();
  };

  const deleteSkill = async (id) => {
    if (!confirm('Delete this skill?')) return;

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      fetchSkills();
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Skills</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={addSkill} className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Skill</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name</label>
              <input
                type="text"
                required
                value={newSkill.skill_name}
                onChange={(e) => setNewSkill({...newSkill, skill_name: e.target.value})}
                placeholder="e.g., Python, Project Management"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={newSkill.category}
                onChange={(e) => setNewSkill({...newSkill, category: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="Technical">Technical</option>
                <option value="Soft Skills">Soft Skills</option>
                <option value="Languages">Languages</option>
                <option value="Tools">Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency</label>
              <select
                value={newSkill.proficiency_level}
                onChange={(e) => setNewSkill({...newSkill, proficiency_level: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Save Skill
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

      {/* Skills List */}
      <div className="space-y-6">
        {Object.keys(groupedSkills).length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No skills added yet</p>
            <p className="text-gray-400 text-sm">Add your skills to help tailor your resume better!</p>
          </div>
        ) : (
          Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {categorySkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-3"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{skill.skill_name}</p>
                      <p className="text-xs text-gray-500">{skill.proficiency_level}</p>
                    </div>
                    <button
                      onClick={() => deleteSkill(skill.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}