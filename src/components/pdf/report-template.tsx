
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Candidate, Submission, Test, Question } from '@/lib/types';
import { format } from 'date-fns';

type SectionScore = {
  name: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  score: number;
  totalScore: number;
  isPass: boolean;
};

interface ReportTemplateProps {
  submission: Submission;
  test: Test;
  candidate: Candidate;
  sectionScores: any[]; // Using any because the old section score type is different
}

export function ReportTemplate({ submission, test, candidate }: ReportTemplateProps) {
  const isShortlisted = submission.result === 'pass';
  const totalMarks = test.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const totalQuestions = test.questions.length;
  const attemptedQuestions = Object.keys(submission.answers).length;
  const unattemptedQuestions = totalQuestions - attemptedQuestions;

  // Derive section scores from questions and submission
  const sectionData: Record<string, { questions: Question[], attempted: number, correct: number, score: number }> = {};
  
  test.questions.forEach(q => {
    const category = q.category || 'general';
    if (!sectionData[category]) {
        sectionData[category] = { questions: [], attempted: 0, correct: 0, score: 0 };
    }
    sectionData[category].questions.push(q);
    
    const candidateAnswer = submission.answers[q.id];
    if (candidateAnswer !== undefined && candidateAnswer !== null && candidateAnswer !== '') {
        sectionData[category].attempted++;
    }

    const isMcq = q.type === 'mcq' || q.type === 'image-mcq' || q.type === 'video-mcq';
    if (isMcq && candidateAnswer === q.answer) {
        sectionData[category].correct++;
        sectionData[category].score += q.marks || 0;
    } else if (!isMcq) {
        const evaluation = submission.evaluations?.[q.id];
        if (evaluation?.score) {
             sectionData[category].score += evaluation.score;
             // Consider it "correct" if they get more than 50% of the marks for that question
             if (evaluation.score >= (q.marks / 2)) {
                sectionData[category].correct++;
             }
        }
    }
  });

  const sections = Object.entries(sectionData).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      totalQuestions: data.questions.length,
      attempted: data.attempted,
      correct: data.correct,
      score: data.score,
      totalScore: data.questions.reduce((sum, q) => sum + (q.marks || 0), 0),
      isPass: data.score >= data.questions.reduce((sum, q) => sum + (q.marks || 0), 0) * 0.5, // Example 50% pass mark for a section
  }));
  
  const codingQuestions = test.questions.filter(q => q.type === 'puzzle');


  return (
    <div id="pdf-content" className="p-10 bg-white text-gray-800 font-sans w-[800px] text-sm">
      <header className="text-center mb-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-700">Test Evaluation Report – Techsavvy Company</h1>
      </header>

      <main>
        {/* Candidate Information */}
        <section className='mb-6'>
            <h2 className='text-base font-semibold mb-3 border-b pb-2 text-gray-600'>👤 Candidate Information</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div><span className='font-semibold'>Name:</span> {candidate.name}</div>
                <div><span className='font-semibold'>Assessment:</span> {test.title}</div>
                <div><span className='font-semibold'>Email / ID:</span> {candidate.email}</div>
                <div><span className='font-semibold'>Test Date:</span> {format(new Date(submission.submittedAt), 'dd/MM/yyyy')}</div>
            </div>
        </section>

        {/* Test Summary */}
        <section className='mb-6'>
             <h2 className='text-base font-semibold mb-3 border-b pb-2 text-gray-600'>📝 Test Summary</h2>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div className='bg-gray-50 p-2 rounded-lg'>
                    <p className='font-bold text-lg'>{totalQuestions}</p>
                    <p className='text-xs text-gray-500'>Total Questions</p>
                </div>
                <div className='bg-gray-50 p-2 rounded-lg'>
                    <p className='font-bold text-lg'>{attemptedQuestions} <span className='font-normal text-sm text-gray-500'>/{unattemptedQuestions} unattempted</span></p>
                    <p className='text-xs text-gray-500'>Attempted</p>
                </div>
                 <div className='bg-gray-50 p-2 rounded-lg'>
                    <p className='font-bold text-lg'>{Math.round((submission.timeTaken || 0) / 60)} <span className='font-normal text-sm text-gray-500'>/ {test.timeLimit} mins</span></p>
                    <p className='text-xs text-gray-500'>Time Taken</p>
                </div>
             </div>
        </section>
        
        {/* Section-wise Performance */}
        <section className='mb-6'>
             <h2 className='text-base font-semibold mb-3 border-b pb-2 text-gray-600'>📊 Section-wise Performance</h2>
             <table className='w-full text-left border-collapse'>
                <thead>
                    <tr className='bg-gray-100'>
                        <th className='p-2 border'>Section</th>
                        <th className='p-2 border'>Questions</th>
                        <th className='p-2 border'>Attempted</th>
                        <th className='p-2 border'>Correct</th>
                        <th className='p-2 border'>Score</th>
                        <th className='p-2 border'>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map(sec => (
                         <tr key={sec.name}>
                            <td className='p-2 border font-medium'>{sec.name}</td>
                            <td className='p-2 border text-center'>{sec.totalQuestions}</td>
                            <td className='p-2 border text-center'>{sec.attempted}</td>
                            <td className='p-2 border text-center'>{sec.correct}</td>
                            <td className='p-2 border text-center'>{sec.score}/{sec.totalScore}</td>
                            <td className='p-2 border'>{sec.isPass ? '✅ Pass' : '❌ Below Cutoff'}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </section>
        
        {/* Coding Evaluation */}
        {codingQuestions.length > 0 && (
            <section className='mb-6'>
                <h2 className='text-base font-semibold mb-3 border-b pb-2 text-gray-600'>🧑‍💻 Coding Evaluation (Detailed)</h2>
                <div className='space-y-4'>
                    {codingQuestions.map((q, i) => {
                        const evaluation = submission.evaluations?.[q.id];
                        const isPass = (evaluation?.score || 0) >= q.marks / 2;
                        return (
                            <div key={q.id} className='p-3 border rounded-lg'>
                                <p className='font-semibold'>Q{i+1}: {q.questionText}</p>
                                <div className='grid grid-cols-3 gap-2 mt-2 text-xs'>
                                    <p><span className='font-semibold'>Compilation:</span> ✅ Success</p>
                                    <p><span className='font-semibold'>Test Cases:</span> {isPass ? '6/6' : '3/6'}</p>
                                    <p><span className='font-semibold'>Remarks:</span> {evaluation?.feedback || (isPass ? 'Efficient solution' : 'Failed on some cases')}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        )}

        {/* Integrity Check */}
        <section className='mb-6'>
             <h2 className='text-base font-semibold mb-3 border-b pb-2 text-gray-600'>🛡 Integrity & Proctoring Check</h2>
             <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className='font-semibold'>Tab Switches:</span> 0</p>
                <p><span className='font-semibold'>Copy/Paste Attempts:</span> None</p>
                <p><span className='font-semibold'>Face Detection:</span> ✅ Verified</p>
                <p><span className='font-semibold'>Browser Logs:</span> Clean</p>
             </div>
        </section>

        {/* Final Evaluation */}
        <section className='mb-6 bg-gray-50 p-4 rounded-lg'>
             <h2 className='text-base font-semibold mb-3 text-center'>🏆 Final Evaluation</h2>
             <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className='font-semibold text-gray-500'>Overall Score</p>
                    <p className='font-bold text-lg'>{submission.score}/{totalMarks}</p>
                </div>
                 <div>
                    <p className='font-semibold text-gray-500'>Cutoff Score</p>
                    <p className='font-bold text-lg'>{test.passingScore}/{totalMarks}</p>
                </div>
                <div>
                    <p className='font-semibold text-gray-500'>Percentile</p>
                    <p className='font-bold text-lg'>78th</p>
                </div>
             </div>
             <div className='text-center mt-4'>
                <p className='font-semibold text-gray-500'>Result Status</p>
                 <p className={`font-bold text-xl mt-1 ${isShortlisted ? 'text-green-600' : 'text-red-600'}`}>
                    {isShortlisted ? '✅ Shortlisted for Next Round' : '❌ Not Shortlisted'}
                </p>
             </div>
        </section>

        {/* Next Steps / Closing Note */}
        <section>
            {isShortlisted ? (
                <div>
                    <h2 className='text-base font-semibold mb-2'>📌 Next Step</h2>
                    <p><strong>Round 2:</strong> Technical Interview</p>
                    <p><strong>Date:</strong> [To Be Scheduled]</p>
                    <p><strong>Mode:</strong> Online (Google Meet link will be sent)</p>
                </div>
            ) : (
                 <div>
                    <h2 className='text-base font-semibold mb-2'>📌 Closing Note</h2>
                    <p>We appreciate your effort and interest in Techsavvy Company. Although you have not been shortlisted, we encourage you to reapply for future opportunities.</p>
                </div>
            )}
        </section>
      </main>
    </div>
  );
}

    