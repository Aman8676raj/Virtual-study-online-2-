import React from 'react';
import { motion } from 'framer-motion';

const CookiePolicy = () => {
    return (
        <div className="min-h-screen pt-24 px-4 pb-12 bg-gray-50 dark:bg-gray-900">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl"
            >
                <h1 className="text-4xl font-bold font-display text-gray-900 dark:text-white mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">Cookie Policy</h1>

                <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <p className="lead text-lg">Last Updated: {new Date().toLocaleDateString()}</p>

                    <h3>1. What Are Cookies?</h3>
                    <p>Cookies are small pieces of text sent to your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.</p>

                    <h3>2. How We Use Cookies</h3>
                    <p>When you use and access the Service, we may place a number of cookies files in your web browser. We use cookies for the following purposes:</p>
                    <ul>
                        <li><strong>Essential Cookies:</strong> To enable certain functions of the Service, such as authentication and preventing fraud.</li>
                        <li><strong>Preference Cookies:</strong> To remember your preferences, such as language or theme settings.</li>
                        <li><strong>Analytics Cookies:</strong> To track information how the Service is used so that we can make improvements.</li>
                    </ul>

                    <h3>3. Third-Party Cookies</h3>
                    <p>In addition to our own cookies, we may also use various third-parties cookies to report usage statistics of the Service (e.g., Google Analytics).</p>

                    <h3>4. Your Choices Regarding Cookies</h3>
                    <p>If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser.</p>
                    <p>Please note, however, that if you delete cookies or refuse to accept them, you might not be able to use all of the features we offer, you may not be able to store your preferences, and some of our pages might not display properly.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default CookiePolicy;
