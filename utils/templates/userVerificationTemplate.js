// userVerificationTemplate.js

export function userVerificationTemplate(fullname) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Verified</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                background: linear-gradient(135deg, #6D28D9, #A855F7); /* Purple gradient */
                margin: 0; 
                padding: 2rem; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh;
                color: #333;
            }
            .container { 
                max-width: 600px; 
                background-color: white; 
                padding: 2rem; 
                border-radius: 10px; 
                box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); 
                text-align: center;
                border: 2px solid #8A4AF3; /* Match with your purple theme */
            }
            .header { 
                margin-bottom: 2rem; 
                color: #8A4AF3; /* Match with your purple theme */
            }
            .header h1 { 
                font-size: 2.5rem; 
                margin: 0;
            }
            .header p { 
                font-size: 1.2rem; 
                margin-top: 0.5rem; 
                color: #666;
            }
            .content { 
                margin-bottom: 2rem; 
            }
            .content h2 { 
                font-size: 1.8rem; 
                margin-bottom: 1rem; 
                color: #333;
            }
            .content p { 
                font-size: 1.2rem; 
                color: #555; 
                margin-bottom: 1.5rem;
            }
            .footer { 
                margin-top: 2rem; 
                font-size: 0.9rem; 
                color: #777; 
                text-align: center;
            }
            .footer p { 
                margin: 0.5rem 0;
            }
            a { 
                color: #8A4AF3; /* Match with your purple theme */
                text-decoration: none; 
            }
            a:hover { 
                text-decoration: underline; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Account Verified</h1>
                <p>Congratulations, ${fullname}!</p>
            </div>
  
            <div class="content">
                <h2>Welcome to Talent ID</h2>
                <p>Your account has been successfully verified by our admin team. You now have full access to all features and services provided by Talent ID.</p>
                <p>Feel free to explore your dashboard and make the most of your Talent ID experience.</p>
            </div>
  
            <div class="footer">
                <p>Thank you for choosing Talent ID.</p>
                <p>If you have any questions, feel free to <a href="mailto:support@talentid.com">contact our support team</a>.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
  
