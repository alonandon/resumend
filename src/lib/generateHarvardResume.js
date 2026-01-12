import jsPDF from 'jspdf';

export const generateHarvardResumePDF = async (profileData, educationData, experiencesData, skillsData, optimizedBullets = null) => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'letter',
    compress: true
  });

  pdf.setProperties({
    title: `${profileData.full_name} - Resume`,
    subject: 'Professional Resume',
    author: profileData.full_name,
    creator: 'ResuMend'
  });

  const margins = {
    left: 12.7,  // 0.5 inches
    right: 12.7, // 0.5 inches
    top: 12.7,   // 0.5 inches - reduced from 20mm
    bottom: 12.7 // 0.5 inches - reduced from 20mm
  };

  const pageWidth = 215.9;
  const contentWidth = pageWidth - margins.left - margins.right;
  let yPos = margins.top;
  const lineHeight = 4.5; // Tighter line height
  const sectionSpacing = 5; // Reduced section spacing

  const checkPageBreak = (spaceNeeded) => {
    if (yPos + spaceNeeded > 279.4 - margins.bottom) {
      pdf.addPage();
      yPos = margins.top;
      return true;
    }
    return false;
  };

  const addWrappedText = (text, x, y, maxWidth, fontSize, alignment = 'left') => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(String(text), maxWidth);
    
    lines.forEach((line, index) => {
      checkPageBreak(lineHeight);
      if (alignment === 'center') {
        pdf.text(line, pageWidth / 2, y + (index * lineHeight), { align: 'center' });
      } else {
        pdf.text(line, x, y + (index * lineHeight));
      }
    });
    
    return lines.length * lineHeight;
  };

  // ============ HEADER SECTION ============
  pdf.setFont('times', 'bold');
  pdf.setFontSize(18);
  pdf.text(profileData.full_name.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Contact info in smaller font
  pdf.setFont('times', 'normal');
  pdf.setFontSize(9);
  
  const contactParts = [];
  if (profileData.phone) contactParts.push(profileData.phone);
  if (profileData.email) contactParts.push(profileData.email);
  if (profileData.linkedin_url) contactParts.push(profileData.linkedin_url.replace('https://', '').replace('http://', ''));
  
  const contactLine = contactParts.join(' | ');
  pdf.text(contactLine, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;

  // Thick line under header
  pdf.setDrawColor(0);
  pdf.setLineWidth(1.5);
  pdf.line(margins.left, yPos, pageWidth - margins.right, yPos);
  yPos += 1;
  
  // Thin line
  pdf.setLineWidth(0.5);
  pdf.line(margins.left, yPos, pageWidth - margins.right, yPos);
  yPos += sectionSpacing;

  // ============ PROFESSIONAL EXPERIENCE SECTION ============
  if (experiencesData && experiencesData.length > 0) {
    checkPageBreak(20);
    
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('PROFESSIONAL EXPERIENCE', margins.left, yPos);
    yPos += 1;
    
    pdf.setLineWidth(0.5);
    pdf.line(margins.left, yPos, pageWidth - margins.right, yPos);
    yPos += 4;

    experiencesData.forEach((exp, index) => {
      checkPageBreak(25);

      // Company name in italic
      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(10);
      const companyLocation = exp.company + (exp.location ? ` - ${exp.location}` : '');
      pdf.text(String(companyLocation), margins.left, yPos);
      
      // Dates on right
      let dateText = '';
      if (exp.start_date || exp.end_date || exp.is_current) {
        const startDate = exp.start_date 
          ? new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
          : '';
        const endDate = exp.is_current 
          ? 'Present' 
          : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '');
        
        if (startDate || endDate) {
          dateText = startDate && endDate ? `${startDate} - ${endDate}` : (startDate || endDate);
        }
      }
      
      if (dateText) {
        pdf.setFont('times', 'italic');
        pdf.text(String(dateText), pageWidth - margins.right, yPos, { align: 'right' });
      }
      yPos += 4.5;

      // Job title
      pdf.setFont('times', 'italic');
      pdf.setFontSize(10);
      pdf.text(String(exp.job_title), margins.left, yPos);
      yPos += 4.5;

      // Responsibilities - Use optimized bullets if available
      let bulletPoints = [];
      
      if (optimizedBullets && optimizedBullets[exp.id]) {
        // Use AI-optimized bullets
        bulletPoints = optimizedBullets[exp.id];
      } else if (exp.responsibilities && exp.responsibilities.length > 0) {
        // Fallback to original bullets
        bulletPoints = exp.responsibilities.map(r => r.description);
      }

      if (bulletPoints.length > 0) {
        bulletPoints.forEach((bullet) => {
          checkPageBreak(10);
          
          pdf.setFont('times', 'normal');
          pdf.setFontSize(10);
          pdf.text('•', margins.left + 2, yPos);
          
          const bulletHeight = addWrappedText(
            String(bullet),
            margins.left + 6,
            yPos,
            contentWidth - 6,
            10
          );
          yPos += bulletHeight + 1; // Tighter spacing between bullets
        });
      }

      if (index < experiencesData.length - 1) {
        yPos += 3; // Space between jobs
      }
    });

    yPos += sectionSpacing;
  }

  // ============ EDUCATION SECTION ============
  if (educationData && educationData.length > 0) {
    checkPageBreak(20);
    
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('EDUCATION', margins.left, yPos);
    yPos += 1;
    
    pdf.setLineWidth(0.5);
    pdf.line(margins.left, yPos, pageWidth - margins.right, yPos);
    yPos += 4;

    educationData.forEach((edu, index) => {
      checkPageBreak(20);

      // Institution in bold italic
      pdf.setFont('times', 'bolditalic');
      pdf.setFontSize(10);
      const institutionLocation = edu.institution + (edu.location ? ` - ${edu.location}` : '');
      pdf.text(String(institutionLocation), margins.left, yPos);
      
      // Dates on right
      const startDate = edu.start_date 
        ? new Date(edu.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '';
      const endDate = edu.end_date 
        ? new Date(edu.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Expected';
      const dateText = startDate && endDate ? `${startDate} - ${endDate}` : (endDate || '');
      
      if (dateText) {
        pdf.setFont('times', 'italic');
        pdf.text(String(dateText), pageWidth - margins.right, yPos, { align: 'right' });
      }
      yPos += 4.5;

      // Degree in italic
      pdf.setFont('times', 'italic');
      pdf.setFontSize(10);
      const degreeText = edu.degree + (edu.field_of_study ? ` - ${edu.field_of_study}` : '');
      pdf.text(String(degreeText), margins.left, yPos);
      yPos += 4.5;

      // Additional details as bullets
      const eduDetails = [];
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);
      if (edu.honors) eduDetails.push(edu.honors);

      eduDetails.forEach(detail => {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10);
        pdf.text('•', margins.left + 2, yPos);
        
        const detailHeight = addWrappedText(
          String(detail),
          margins.left + 6,
          yPos,
          contentWidth - 6,
          10
        );
        yPos += detailHeight + 1;
      });

      if (index < educationData.length - 1) {
        yPos += 3;
      }
    });

    yPos += sectionSpacing;
  }

  // ============ SKILLS SECTION ============
  if (skillsData && skillsData.length > 0) {
    checkPageBreak(20);
    
    pdf.setFont('times', 'bold');
    pdf.setFontSize(10);
    pdf.text('SKILLS, TECHNICAL PROFICIENCIES & INTERESTS', margins.left, yPos);
    yPos += 1;
    
    pdf.setLineWidth(0.5);
    pdf.line(margins.left, yPos, pageWidth - margins.right, yPos);
    yPos += 4;

    // Group skills by category
    const groupedSkills = skillsData.reduce((acc, skill) => {
      const category = skill.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(String(skill.skill_name));
      return acc;
    }, {});

    // Calculate how many columns we need
    const categories = Object.entries(groupedSkills);
    const columnsPerRow = 3;
    const columnWidth = contentWidth / columnsPerRow;
    
    // Display in columns
    let currentColumn = 0;
    let maxYInRow = yPos;
    let startX = margins.left;
    let startY = yPos;

    categories.forEach(([category, skills], index) => {
      const xPos = margins.left + (currentColumn * columnWidth);
      yPos = startY;
      
      pdf.setFont('times', 'bold');
      pdf.setFontSize(9);
      pdf.text(String(category), xPos, yPos);
      yPos += 4;
      
      pdf.setFont('times', 'normal');
      skills.forEach(skill => {
        checkPageBreak(10);
        pdf.text('•', xPos + 1, yPos);
        
        const skillHeight = addWrappedText(
          String(skill),
          xPos + 4,
          yPos,
          columnWidth - 6,
          9
        );
        yPos += skillHeight + 1;
      });

      maxYInRow = Math.max(maxYInRow, yPos);
      currentColumn++;
      
      if (currentColumn >= columnsPerRow || index === categories.length - 1) {
        currentColumn = 0;
        yPos = maxYInRow + 3;
        startY = yPos;
        maxYInRow = yPos;
      }
    });
  }

  // Generate filename
  const fileName = `${profileData.full_name.replace(/\s+/g, '_')}_Resume.pdf`;
  
  pdf.save(fileName);

  return { success: true, fileName };
};