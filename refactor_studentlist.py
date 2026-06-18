import re

with open("src/app/students/[branch]/StudentList.tsx", "r") as f:
    content = f.read()

# 1. Remove imports if any (like setExamMonth)
content = re.sub(r'setExamMonth,\s*', '', content)
content = re.sub(r'getExamMonths,\s*', '', content)

# 2. Remove states
content = re.sub(r'\s*const \[examMonths.*?\n', '\n', content)
content = re.sub(r'\s*const \[isExamMonthMode.*?\n', '\n', content)
content = re.sub(r'\s*const \[confirmExamMonth.*?\n', '\n', content)
content = re.sub(r'\s*const \[examEligibleStudent.*?\n', '\n', content)
content = re.sub(r'\s*const \[examFeeAmount.*?\n', '\n', content)

# 3. Simplify loadStudents
load_students_new = """    try {
      const data = await getStudents(branch, month, forceRefresh, selectedYear);
      setStudents(data);
    } catch (err) {"""
content = re.sub(r'    try \{\s*const \[data, monthsData\].*?setIsExamMonthMode.*?\} catch \(err\) \{', load_students_new, content, flags=re.DOTALL)

# 4. Remove canCreateExamMonth and handleSetExamMonth
content = re.sub(r'\s*const canCreateExamMonth = useMemo.*?handleSetExamMonth.*?\}\s*;\s*', '\n', content, flags=re.DOTALL)

# 5. Remove handleConfirmExamEligibility (which is around line 482)
content = re.sub(r'\s*const handleConfirmExamEligibility = async \(\) => \{.*?\n  \};\n', '\n', content, flags=re.DOTALL)

# 6. Remove isExamMonthMode UI (line 865)
content = re.sub(r'\s*\{isExamMonthMode && \(\s*<div className="flex-1 px-4.*?Belt Examination Month\s*</div>\s*\)\}', '', content, flags=re.DOTALL)

# 7. Remove the examEligibleStudent modal (around line 1080)
content = re.sub(r'\s*\{examEligibleStudent && \(.*?ALLOCATE"\}\s*</button>\s*</div>\s*</div>\s*\)\}', '', content, flags=re.DOTALL)

# 8. Remove the Action button inside the student loop (around line 662)
content = re.sub(r'\s*\{isExamMonthMode && isFeeActiveStudent\(student\) && \(.*?</button>\s*\)\}', '', content, flags=re.DOTALL)

# 9. Modify the Action Button area to include a new "Pay Belt Exam" button
action_buttons_replacement = """          {/* Action Button */}
          <div className="flex-shrink-0 flex items-center gap-2">
            {(student.eventDues || []).filter(d => d.feeType === 'belt_exam' && d.status !== 'paid' && d.status !== 'waived').map((due) => (
              <button
                key={due.id}
                onClick={(e) => handleMarkExamPaidClick(e, student, due)}
                disabled={markingPaid === student.id || markingStatus === student.id}
                className="w-9 h-9 rounded-full border border-amber-500/50 bg-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/30 transition-all shadow-md shadow-amber-900/20"
                title="Mark Belt Exam Paid"
              >
                <Award className="w-4 h-4" />
              </button>
            ))}"""
content = re.sub(r'\s*\{\/\* Action Button \*\/\}\s*<div className="flex-shrink-0 flex items-center gap-2">', '\n' + action_buttons_replacement, content)

# 10. Add handleMarkExamPaidClick function
new_handler = """  const handleMarkExamPaidClick = async (e: React.MouseEvent, student: Student, due: any) => {
    e.stopPropagation();
    setMarkingPaid(student.id);
    try {
      const response = await fetch("/api/feetrack/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_paid",
          skfId: student.id,
          month,
          year: selectedYear,
          feeType: due.feeType,
          feeRecordId: due.id
        })
      });
      if (response.ok) {
        await loadStudents(true);
      } else {
        alert("Failed to mark exam paid");
      }
    } catch (err) {
      alert("Failed to mark exam paid");
    } finally {
      setMarkingPaid(null);
    }
  };

  const handleMarkPaidClick"""

content = content.replace("  const handleMarkPaidClick", new_handler)

with open("src/app/students/[branch]/StudentList.tsx", "w") as f:
    f.write(content)

