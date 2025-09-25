// Update this page (the content is just a fallback if you fail to update the page)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to the main setup page
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">CyberSentry Command Center</h1>
        <p className="text-xl text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
};

export default Index;
