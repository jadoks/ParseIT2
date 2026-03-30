import React, { useState } from 'react';
import Community, { CommunityPost } from './TeacherCommunity'; // Adjust path

const CommunityScreen = () => {
  // 1. Initialize posts state with your initial data
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([
    {
      id: '1',
      userName: 'Dr. Smith',
      avatar: require('../../assets/images/default_profile.png'),
      dateTime: '2 hours ago',
      content: 'Does anyone have the notes for the last Physics lecture?',
      answers: [],
    },
  ]);

  // 2. Define the function that adds a new post to the list
  const handleCreatePost = (queryText: string) => {
    const newPost: CommunityPost = {
      id: Date.now().toString(), // Simple unique ID
      userName: 'Jade', // Or get this from your Auth context
      avatar: require('../../assets/images/default_profile.png'),
      dateTime: 'Just now',
      content: queryText,
      answers: [],
    };

    // Update the state: latest post goes to the top
    setAllPosts([newPost, ...allPosts]);
  };

  return (
    <Community 
      userName="Jade" 
      posts={allPosts} 
      onCreatePost={handleCreatePost} 
    />
  );
};

export default CommunityScreen;