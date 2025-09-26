"use client";

//The home page for the awqaf tracker
//changes to this file will affect the home page

//imports
import Link from "next/link";
import { useState } from "react";

export default function Page() {
  const [currentFaqIndex, setCurrentFaqIndex] = useState(0);

  const faqData = [
    {
      question: "What is Awqaf Tracker?",
      answer: "Awqaf Tracker is a platform that helps manage and track waqf funds with complete transparency and accountability."
    },
    {
      question: "How do I make a donation?",
      answer: "Simply click on the 'Donate' button in the navigation, select your preferred waqf fund, and follow the secure payment process."
    },
    {
      question: "Can I track my donations?",
      answer: "Yes! Once you create an account, you can access your dashboard to view all your donation history and track how your funds are being used."
    },
    {
      question: "Is my information secure?",
      answer: "Absolutely. We use industry-standard encryption and security measures to protect your personal and financial information."
    },
    {
      question: "How can I contact support?",
      answer: "You can reach our support team through the contact information provided in the footer, or use the help links in your account dashboard."
    }
  ];

  const nextFaq = () => {
    setCurrentFaqIndex((prev) => (prev + 1) % faqData.length);
  };

  const prevFaq = () => {
    setCurrentFaqIndex((prev) => (prev - 1 + faqData.length) % faqData.length);
  };

  const goToFaq = (index: number) => {
    setCurrentFaqIndex(index);
  };

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Login Form - Left Side */}
        <div className="login-section">
          <div className="login-container">
            <h2 className="login-title">Sign In</h2>
            <form className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email or ID</label>
                <input 
                  type="text" 
                  id="email" 
                  className="form-input" 
                  placeholder="Enter your email or ID"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  className="form-input" 
                  placeholder="Enter your password"
                />
              </div>
              
              <button type="submit" className="login-button">
                Log In
              </button>
              
              <Link href="/signup" className="signup-link">
                Sign Up
              </Link>
              
              <div className="login-help">
              </div>
            </form>
          </div>
        </div>

        {/* FAQ Slideshow - Right Side */}
        <div className="faq-section">
          <h2 className="faq-title">Frequently Asked Questions</h2>
          
          <div className="faq-slideshow">
            <div className="faq-slide">
              <h3 className="faq-question">{faqData[currentFaqIndex].question}</h3>
              <p className="faq-answer">{faqData[currentFaqIndex].answer}</p>
            </div>
            
            <div className="faq-navigation">
              <button 
                className="faq-nav-btn faq-prev" 
                onClick={prevFaq}
                aria-label="Previous question"
              >
                ←
              </button>
              
              <div className="faq-dots">
                {faqData.map((_, index) => (
                  <button
                    key={index}
                    className={`faq-dot ${index === currentFaqIndex ? 'active' : ''}`}
                    onClick={() => goToFaq(index)}
                    aria-label={`Go to question ${index + 1}`}
                  />
                ))}
              </div>
              
              <button 
                className="faq-nav-btn faq-next" 
                onClick={nextFaq}
                aria-label="Next question"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}