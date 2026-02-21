import { db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  orderBy
} from 'firebase/firestore';

// Save user registration data
export const saveUserProfile = async (userId, userData) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...userData,
      createdAt: new Date(),
      totalQuestions: 0,
      accuracy: 0,
      preferredOperations: getDefaultOperations(userData.grade),
    });
    return true;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Save answer attempt
export const saveAnswer = async (userId, questionData) => {
  try {
    await addDoc(collection(db, 'answers'), {
      userId,
      ...questionData,
      timestamp: new Date(),
    });
    return true;
  } catch (error) {
    console.error('Error saving answer:', error);
    throw error;
  }
};

// Get user answer history
export const getUserAnswerHistory = async (userId) => {
  try {
    const q = query(
      collection(db, 'answers'),
      where('userId', '==', userId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    // If orderBy fails (missing index), fall back to unordered query
    console.warn('Ordered query failed, falling back to unordered:', error.message);
    try {
      const q = query(collection(db, 'answers'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => doc.data());
      // Sort client-side as fallback
      docs.sort((a, b) => {
        const tsA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
        const tsB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
        return tsA - tsB;
      });
      return docs;
    } catch (err) {
      console.error('Error fetching answer history:', err);
      return [];
    }
  }
};

// Get user statistics
export const getUserStats = async (userId) => {
  try {
    const history = await getUserAnswerHistory(userId);
    if (history.length === 0) {
      return {
        totalQuestions: 0,
        accuracy: 0,
        streak: 0,
        weakAreas: [],
      };
    }

    const totalQuestions = history.length;
    const correctAnswers = history.filter(a => a.correct).length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

    // Calculate weak areas
    const areas = {};
    history.forEach(a => {
      const operation = a.operation || 'general';
      if (!areas[operation]) areas[operation] = { correct: 0, total: 0 };
      areas[operation].total++;
      if (a.correct) areas[operation].correct++;
    });

    const weakAreas = Object.entries(areas)
      .map(([name, data]) => ({
        name,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        total: data.total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    // Calculate streak
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].correct) {
        streak++;
      } else {
        break;
      }
    }

    return { totalQuestions, accuracy, streak, weakAreas };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return { totalQuestions: 0, accuracy: 0, streak: 0, weakAreas: [] };
  }
};

// Update user preferred operations
export const updateUserOperations = async (userId, operations) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      preferredOperations: operations,
    });
    return true;
  } catch (error) {
    console.error('Error updating operations:', error);
    throw error;
  }
};

// Get default operations based on grade
function getDefaultOperations(grade) {
  const gradeMap = {
    1: ['addition', 'subtraction'],
    2: ['addition', 'subtraction', 'multiplication'],
    3: ['multiplication', 'division'],
    4: ['fractions', 'decimals'],
    5: ['fractions', 'decimals', 'percentages'],
    6: ['fractions', 'decimals', 'percentages'],
    7: ['percentages', 'ratios', 'algebra'],
    8: ['algebra', 'geometry'],
    9: ['algebra', 'geometry', 'trigonometry'],
    10: ['algebra', 'geometry', 'trigonometry', 'calculus'],
  };
  return gradeMap[Math.min(grade, 10)] || ['addition', 'subtraction', 'multiplication', 'division'];
}
