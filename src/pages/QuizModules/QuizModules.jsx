import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/SideBar/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { ref, query as rtdbQuery, orderByChild, equalTo, onValue, remove } from 'firebase/database';
import { realtimeDB } from '../../services/firebaseConfig';
import ConfirmationModal from '../../components/Modal/ConfirmationModal';
import styles from './QuizModules.module.css';

// Component for individual quiz card
function QuizCard({ quiz, onDeleteQuiz }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandButtonRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const cardRef = useRef(null);

  const toggleExpand = () => {
    setIsExpanded(prevExpanded => !prevExpanded);
  };

  // Effect for card click to expand/collapse
  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const handleCardClick = (event) => {
      // Only toggle expand if the click is not on a button or an element within a button
      if (event.target.tagName !== 'BUTTON' && !event.target.closest('button')) {
        toggleExpand();
      }
    };

    cardElement.addEventListener('click', handleCardClick);
    return () => {
      cardElement.removeEventListener('click', handleCardClick);
    };
  }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

  // Effect for expand button
  useEffect(() => {
    const buttonElement = expandButtonRef.current;
    if (!buttonElement) return;

    buttonElement.addEventListener('click', toggleExpand);
    return () => {
      buttonElement.removeEventListener('click', toggleExpand);
    };
  }, [toggleExpand]); // Re-run if toggleExpand changes (though it shouldn't in this case)

  // Effect for delete button
  useEffect(() => {
    const buttonElement = deleteButtonRef.current;
    if (!buttonElement) return;

    const handleDeleteClick = (event) => {
      event.stopPropagation(); // Prevent card click/expand when delete is clicked
      onDeleteQuiz(quiz.id, quiz.title || quiz.id.replace(/_/g, ' '));
    };

    buttonElement.addEventListener('click', handleDeleteClick);
    return () => {
      buttonElement.removeEventListener('click', handleDeleteClick);
    };
  }, [quiz.id, quiz.title, onDeleteQuiz]);

  const displayTitle = quiz.title || (quiz.id ? quiz.id.replace(/_/g, ' ') : "Untitled Quiz");

  return (
    <div ref={cardRef} className={`${styles.quizCard} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.quizCardHeader}>
        <h3 className={styles.quizTitle}>{displayTitle}</h3>
        <div className={styles.actions}>
          <button ref={expandButtonRef} className={styles.expandButton}>
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button ref={deleteButtonRef} className={styles.deleteButton}>
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

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [quizToConfirmDelete, setQuizToConfirmDelete] = useState({ id: null, title: '' });

  // This function is called by QuizCard to initiate deletion
  const handleDeleteQuizRequest = (quizId, quizTitle) => {
    if (!currentUser) {
      setError("Authentication is required to delete quizzes.");
      console.warn("Attempted to delete quiz without authentication.");
      return;
    }
    setQuizToConfirmDelete({ id: quizId, title: quizTitle });
    setIsConfirmModalOpen(true);
  };

  // This function is called when the user confirms deletion in the modal
  const confirmDeleteQuiz = async () => {
    if (!quizToConfirmDelete.id || !currentUser) {
      setError("Cannot delete quiz. Missing information or not authenticated.");
      setIsConfirmModalOpen(false);
      return;
    }

    const quizRefPath = `user_topics/${quizToConfirmDelete.id}`;
    const quizDatabaseRef = ref(realtimeDB, quizRefPath);

    try {
      await remove(quizDatabaseRef);
      console.log(`Quiz ${quizToConfirmDelete.id} deleted successfully.`);
      // Quizzes state will update via the onValue listener
    } catch (err) {
      console.error("Error deleting quiz from RTDB:", err);
      setError(`Failed to delete quiz: ${err.message}. Please try again.`);
    } finally {
      setIsConfirmModalOpen(false);
      setQuizToConfirmDelete({ id: null, title: '' });
    }
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setQuizToConfirmDelete({ id: null, title: '' });
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
            id: key,
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
                onDeleteQuiz={handleDeleteQuizRequest}
              />
            ))}
          </div>
        )}
      </main>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmDeleteQuiz}
        title="Confirm Deletion"
        message={`Are you sure you want to delete the quiz "${quizToConfirmDelete.title || quizToConfirmDelete.id}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
} 