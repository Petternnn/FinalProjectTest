import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/SideBar/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { ref, query as rtdbQuery, orderByChild, equalTo, onValue, remove } from 'firebase/database';
import { realtimeDB } from '../../services/firebaseConfig';
import styles from './QuizModules.module.css';

// Component for individual quiz card
function QuizCard({ quiz, onDeleteQuiz }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  const handleCardClick = (event) => {
    // Only toggle expand if the click is not on a button
    if (event.target.tagName !== 'BUTTON' && !event.target.closest('button')) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation(); // Prevent card click/expand when delete is clicked
    onDeleteQuiz(quiz.id);
  };

  //make a readable title if quiz.title is missing
  const displayTitle = quiz.title || (quiz.id ? quiz.id.replace(/_/g, ' ') : "Untitled Quiz");

  return (
    <div className={`${styles.quizCard} ${isExpanded ? styles.expanded : ''}`} onClick={handleCardClick}>
      <div className={styles.quizCardHeader}>
        <h3 className={styles.quizTitle}>{displayTitle}</h3>
        <div className={styles.actions}>
          <button onClick={toggleExpand} className={styles.expandButton}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button onClick={handleDeleteClick} className={styles.deleteButton}>
            Delete
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className={styles.quizDetails}>
          <p><strong>Description:</strong> {quiz.description || 'No description available.'}</p>
          <p><strong>Language:</strong> {quiz.language || 'N/A'}</p>
          <p><strong>Total Questions:</strong> {quiz.questions?.length || 0}</p>
          
          {quiz.questions && quiz.questions.length > 0 && (
            <>
              <h4>Questions:</h4>
              <ul className={styles.quizQuestionsList}>
                {quiz.questions.map((question, index) => (
                  <li key={index} className={styles.quizQuestionItem}>
                    <p><strong>Q{index + 1}:</strong> {question.text}</p>
                    <p><strong>Options:</strong> {question.options?.join(' / ')}</p>
                    <p><strong>Answer:</strong> {question.correct_answer}</p>
                    {question.note && <p><em>Note: {question.note}</em></p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}


export default function QuizModulesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  const handleDeleteQuiz = async (quizIdToDelete) => {
    if (!currentUser) {
      setError("Authentication is required to delete quizzes.");
      console.warn("Attempted to delete quiz without authentication.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the quiz "${quizzes.find(q => q.id === quizIdToDelete)?.title || quizIdToDelete}"? This action cannot be undone.`)) {
      return;
    }

    const quizRefPath = `user_topics/${quizIdToDelete}`;
    const quizDatabaseRef = ref(realtimeDB, quizRefPath);

    try {
      await remove(quizDatabaseRef);
      console.log(`Quiz ${quizIdToDelete} deleted successfully.`);
    } catch (err) {
      console.error("Error deleting quiz from RTDB:", err);
      setError(`Failed to delete quiz: ${err.message}. Please try again.`);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      setQuizzes([]);
      setError("Please log in to view your quizzes.");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Use the imported realtimeDB instance
    const userTopicsRef = ref(realtimeDB, 'user_topics');
    const userQuizzesQuery = rtdbQuery(
      userTopicsRef,
      orderByChild('userId'),
      equalTo(currentUser.uid)
    );

    const unsubscribe = onValue(userQuizzesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const fetchedQuizzes = Object.keys(data)
          .map(key => ({
            id: key, // The key!!!: is the sanitizedQuizTitle (quizId)
            ...data[key],
          }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setQuizzes(fetchedQuizzes);
      } else {
        setQuizzes([]);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching quizzes from RTDB:", err);
      setError("Failed to load quizzes. Please try again.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className={styles.container}>
      <Sidebar />
      <main className={styles.main}>
        <h1 className={styles.header}>My Quiz Modules</h1>
        
        {isLoading && <p className={styles.loadingText}>Loading your quizzes...</p>}
        {error && <p className={styles.errorText}>{error}</p>}
        
        {!isLoading && !error && quizzes.length === 0 && (
          <p className={styles.noQuizzesText}>
            You haven't created any quizzes yet. Go to the Create/Deploy Page to create your first one!
          </p>
        )}

        {!isLoading && !error && quizzes.length > 0 && (
          <div className={styles.quizListContainer}>
            {quizzes.map(quiz => (
              <QuizCard 
                key={quiz.id} 
                quiz={quiz} 
                onDeleteQuiz={handleDeleteQuiz}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 