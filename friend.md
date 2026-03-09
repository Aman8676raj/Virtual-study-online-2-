# How to Add Smooth Page Transitions in React (for Antigravity)

Use this guide to prompt your AI assistant (Antigravity) to implement smooth page animations in your React project.

## Prompt
"I want to add smooth fade/slide transitions when navigating between pages in my React app. Please follow this implementation pattern using `framer-motion`."

## Implementation Pattern

### 1. Install Dependencies
```bash
npm install framer-motion
```

### 2. Create a Page Wrapper Component
Create a reusable wrapper that handles the animation logic for every page.
**File:** `src/components/PageWrapper.jsx`

```jsx
import React from 'react';
import { motion } from 'framer-motion';

const PageWrapper = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
};

export default PageWrapper;
```

### 3. Setup Animated Routes
You need to separate your routes so you can wrap them in `AnimatePresence`. Use `useLocation()` to tell Framer Motion when the route changes.

**File:** `src/components/AnimatedRoutes.jsx`

```jsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageWrapper from './PageWrapper';

// Import your pages...
import Home from '../pages/Home';
import About from '../pages/About';

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        // mode="wait" ensures the exit animation finishes before the new page enters
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route 
                    path="/" 
                    element={
                        <PageWrapper>
                            <Home />
                        </PageWrapper>
                    } 
                />
                <Route 
                    path="/about" 
                    element={
                        <PageWrapper>
                            <About />
                        </PageWrapper>
                    } 
                />
            </Routes>
        </AnimatePresence>
    );
};

export default AnimatedRoutes;
```

### 4. Update App.jsx
Import your `AnimatedRoutes` component instead of standard Routes.

**File:** `src/App.jsx`

```jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Navbar from './components/Navbar';
import AnimatedRoutes from './components/AnimatedRoutes';

function App() {
  return (
    <Router>
      <Navbar />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
```

## Why this works
1.  **`AnimatePresence`**: Detects when a component starts unmounting (exiting) and keeps it in the DOM until the exit animation finishes.
2.  **`key={location.pathname}`**: Forces React to treat the Route change as a completely new component render, triggering the `initial` and `exit` animations.
3.  **`PageWrapper`**: Keeps your route definitions clean by abstracting the repetitive motion logic.
