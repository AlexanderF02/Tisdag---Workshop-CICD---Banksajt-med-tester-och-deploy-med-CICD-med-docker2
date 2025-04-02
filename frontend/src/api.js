const API_URL = 'http://localhost:3003/api';

export const fetchData = async () => {
  try {
    const response = await fetch(`${API_URL}/endpoint`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('There was a problem with the fetch operation:', error);
  }
};