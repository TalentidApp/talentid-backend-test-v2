export function offerLetterTemplate(candidateName, companyName, jobTitle, offerLetterLink, joiningDate, expiryDate) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Congratulations! Your Offer Letter from ${companyName}</title>
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
                border: 2px solid #8A4AF3; /* Match with purple theme */
            }
            .header { 
                margin-bottom: 2rem; 
                color: #8A4AF3; /* Match with purple theme */
            }
            .header h1 { 
                font-size: 2.5rem; 
                margin: 0;
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
            .button {
                display: inline-block;
                padding: 12px 20px;
                font-size: 1.2rem;
                font-weight: bold;
                color: white;
                background-color: #8A4AF3;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 1rem;
                transition: 0.3s;
            }
            .button:hover {
                background-color: #6D28D9;
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p>Hello ${candidateName},</p>
            </div>
  
            <div class="content">
                <h2>Welcome to ${companyName}!</h2>
                <p>We are thrilled to offer you the position of <strong>${jobTitle}</strong>.</p>
                <p>Your expected joining date is <strong>${joiningDate}</strong>.</p>
                <p>Please review and accept the offer by <strong>${expiryDate}</strong>.</p>
                <a href="${offerLetterLink}" class="button">View Offer Letter</a>
            </div>
  
            <div class="footer">
                <p>We look forward to having you onboard at <strong>${companyName}</strong>!</p>
                <p>Powered by <strong>TalentID</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;
}
