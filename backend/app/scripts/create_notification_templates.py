"""
Script to populate default notification templates
Run this once to set up the notification system
"""

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.models import NotificationTemplate
import json


def create_default_templates():
    """Create default notification templates in the database"""
    db = SessionLocal()
    
    templates = [
        {
            "name": "interest_confirmation",
            "subject": "✈️ Your {{ destination_name }} interest is confirmed!",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .highlight { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .button { display: inline-block; background: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Interest Confirmed!</h1>
                        <p>Thank you for choosing TravelKit</p>
                    </div>
                    <div class="content">
                        <h2>Hi {{ user_name }}!</h2>
                        <p>Great news! We've successfully recorded your interest for <strong>{{ destination_name }}</strong> in {{ destination_location }}.</p>
                        
                        <div class="highlight">
                            <h3>📋 Your Interest Details:</h3>
                            <ul>
                                <li><strong>Destination:</strong> {{ destination_name }}, {{ destination_location }}</li>
                                <li><strong>Travel Dates:</strong> {{ date_from }} to {{ date_to }}</li>
                                <li><strong>Group Size:</strong> {{ num_people }} people</li>
                                <li><strong>Interest ID:</strong> #{{ interest_id }}</li>
                            </ul>
                        </div>
                        
                        <h3>🚀 What happens next?</h3>
                        <ol>
                            <li><strong>We're finding your travel buddies:</strong> Our smart matching system is looking for other travelers with similar interests and dates.</li>
                            <li><strong>Group formation:</strong> Once we find 4+ people, we'll form a group and unlock special group pricing.</li>
                            <li><strong>Pricing benefits:</strong> Larger groups get better prices - you could save up to 25% compared to solo travel!</li>
                            <li><strong>Stay updated:</strong> We'll notify you immediately when a group forms or when pricing updates are available.</li>
                        </ol>
                        
                        <p><strong>💡 Pro Tip:</strong> Share this with friends! If they're interested in the same destination and dates, we can match you together for even better group pricing.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://travelkit.com/interests/{{ interest_id }}" class="button">View Your Interest</a>
                            <a href="https://travelkit.com/destinations/{{ destination_name }}" class="button" style="background: #2196F3;">Explore {{ destination_name }}</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Questions? Reply to this email or contact us at <a href="mailto:support@travelkit.com">support@travelkit.com</a></p>
                        <p>Happy travels! 🌍<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
🎉 *Interest Confirmed!*

Hi {{ user_name }}! 

Your interest for *{{ destination_name }}* ({{ destination_location }}) has been confirmed! ✈️

📋 *Details:*
🗓️ {{ date_from }} to {{ date_to }}
👥 {{ num_people }} people
🆔 Interest #{{ interest_id }}

🚀 *What's next?*
• We're finding travel buddies with similar interests
• Groups of 4+ unlock special pricing (up to 25% savings!)
• You'll get notified when a group forms

💡 *Tip:* Share with friends for better group pricing!

Questions? Just reply to this message.

Happy travels! 🌍
- TravelKit Team
            """,
            "template_variables": [
                "user_name", "destination_name", "destination_location", 
                "date_from", "date_to", "num_people", "interest_id"
            ]
        },
        {
            "name": "group_match",
            "subject": "🎉 Group Found! {{ group_size }} travelers matched for {{ destination_name }}",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .highlight { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
                    .price-box { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
                    .member-list { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
                    .button-secondary { background: #2196F3; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Perfect Match Found!</h1>
                        <p>Your {{ destination_name }} group is ready</p>
                    </div>
                    <div class="content">
                        <h2>Fantastic news, {{ user_name }}!</h2>
                        <p>We've successfully matched you with {{ group_size }} travelers for <strong>{{ destination_name }}</strong>! 🎊</p>
                        
                        <div class="highlight">
                            <h3>🎯 Your Group Match:</h3>
                            <ul>
                                <li><strong>Destination:</strong> {{ destination_name }}, {{ destination_location }}</li>
                                <li><strong>Your Dates:</strong> {{ date_from }} to {{ date_to }}</li>
                                <li><strong>Your Group Size:</strong> {{ num_people }} people</li>
                                <li><strong>Total Group Size:</strong> {{ group_size }} travelers</li>
                            </ul>
                        </div>
                        
                        <div class="price-box">
                            <h3>💰 Amazing Group Pricing!</h3>
                            <p style="font-size: 24px; margin: 10px 0;"><strong>₹{{ price_per_person }}</strong> per person</p>
                            <p>You're saving <strong>₹{{ total_savings }}</strong> compared to solo booking!</p>
                        </div>
                        
                        <div class="member-list">
                            <h4>👥 Your Travel Companions:</h4>
                            <p>You'll be traveling with: {{ member_names|join(', ') }}</p>
                            <p><em>Full contact details and group chat will be shared after booking confirmation.</em></p>
                        </div>
                        
                        <h3>🚀 Next Steps:</h3>
                        <ol>
                            <li><strong>Review the details:</strong> Check all travel information and pricing</li>
                            <li><strong>Secure your spot:</strong> Confirm your booking with a small deposit</li>
                            <li><strong>Meet your group:</strong> We'll connect you with your travel companions</li>
                            <li><strong>Final planning:</strong> Coordinate activities and preferences together</li>
                        </ol>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://travelkit.com/groups/{{ group_id }}/confirm" class="button">Confirm Booking Now</a>
                            <a href="https://travelkit.com/groups/{{ group_id }}" class="button button-secondary">View Group Details</a>
                        </div>
                        
                        <p><strong>⏰ Important:</strong> This group pricing is available for the next 72 hours. After that, spots may be released to other travelers.</p>
                    </div>
                    <div class="footer">
                        <p>Need help? Contact us at <a href="mailto:support@travelkit.com">support@travelkit.com</a> or call +91-1234567890</p>
                        <p>Adventure awaits! 🌍<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
🎉 *PERFECT MATCH FOUND!*

Hey {{ user_name }}! Amazing news! ✨

Your *{{ destination_name }}* group is ready with {{ group_size }} travelers! 🎊

💰 *Special Group Pricing:*
₹{{ price_per_person }} per person
💸 You're saving ₹{{ total_savings }}!

👥 *Your Travel Companions:*
{{ member_names|join(', ') }}

🗓️ *Your Dates:* {{ date_from }} to {{ date_to }}

🚀 *Next Steps:*
1️⃣ Confirm your booking (72 hours to secure spot)
2️⃣ Meet your group in our chat
3️⃣ Plan your amazing trip together!

🔗 Confirm now: travelkit.com/groups/{{ group_id }}/confirm

⏰ *Limited time:* Group pricing expires in 72 hours!

Questions? Just reply here!

Adventure time! 🌍
- TravelKit Team
            """,
            "template_variables": [
                "user_name", "destination_name", "destination_location", 
                "date_from", "date_to", "num_people", "group_size",
                "price_per_person", "total_savings", "member_names", "group_id"
            ]
        },
        {
            "name": "pricing_update",
            "subject": "💰 Price {{ price_direction }}! {{ destination_name }} group pricing updated",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .price-update { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
                    .price-decrease { background: #e8f5e8; border-left: 4px solid #4CAF50; }
                    .price-increase { background: #fff3e0; border-left: 4px solid #ff9800; }
                    .button { display: inline-block; background: #ff9800; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>💰 Price Update!</h1>
                        <p>Your {{ destination_name }} group pricing has changed</p>
                    </div>
                    <div class="content">
                        <h2>Hi {{ user_name }}!</h2>
                        <p>We have an important update about your {{ destination_name }} group pricing.</p>
                        
                        <div class="price-update {% if price_direction == 'decreased' %}price-decrease{% else %}price-increase{% endif %}">
                            <h3>📊 Pricing Update:</h3>
                            <p><strong>Previous Price:</strong> ₹{{ old_price }} per person</p>
                            <p><strong>New Price:</strong> ₹{{ new_price }} per person</p>
                            <p><strong>Change:</strong> ₹{{ price_change }} {{ price_direction }}</p>
                            <p><strong>Group Size:</strong> {{ group_size }} travelers</p>
                        </div>
                        
                        {% if price_direction == 'decreased' %}
                        <h3>🎉 Great news!</h3>
                        <p>Your group price has <strong>decreased</strong> by ₹{{ price_change }}! This usually happens when:</p>
                        <ul>
                            <li>More people joined your group</li>
                            <li>We found better deals with our travel partners</li>
                            <li>Seasonal promotions became available</li>
                        </ul>
                        {% else %}
                        <h3>📈 Price adjustment</h3>
                        <p>Your group price has <strong>increased</strong> by ₹{{ price_change }}. This can happen due to:</p>
                        <ul>
                            <li>High demand for this destination/dates</li>
                            <li>Changes in availability or accommodation costs</li>
                            <li>Currency or fuel surcharge adjustments</li>
                        </ul>
                        <p><strong>Don't worry:</strong> This is still significantly better than solo travel pricing!</p>
                        {% endif %}
                        
                        <h3>🚀 What to do next?</h3>
                        <p>Your group booking is still active. The new pricing will be applied automatically. No action needed unless you want to review or modify your booking.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://travelkit.com/groups/{{ group_id }}" class="button">View Updated Group Details</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Questions about pricing? Email us at <a href="mailto:support@travelkit.com">support@travelkit.com</a></p>
                        <p>Happy travels! 🌍<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
💰 *PRICE UPDATE!*

Hi {{ user_name }}!

Your *{{ destination_name }}* group pricing has {{ price_direction }}! 📊

💸 *Price Change:*
Was: ₹{{ old_price }}
Now: ₹{{ new_price }}
Change: ₹{{ price_change }} {{ price_direction }}

👥 Group size: {{ group_size }} travelers

{% if price_direction == 'decreased' %}
🎉 *Great news!* Your price went down! This usually means more people joined or we found better deals.
{% else %}
📈 *Price adjustment* due to high demand or availability changes. Still much better than solo pricing!
{% endif %}

🔗 View details: travelkit.com/groups/{{ group_id }}

No action needed - changes apply automatically!

Questions? Just reply!

🌍 TravelKit Team
            """,
            "template_variables": [
                "user_name", "destination_name", "old_price", "new_price",
                "price_change", "price_direction", "group_size", "group_id"
            ]
        },
        {
            "name": "follow_up",
            "subject": "🔥 {{ similar_interests_count }} more people interested in {{ destination_name }}!",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #e91e63 0%, #ad1457 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .highlight { background: #fce4ec; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e91e63; }
                    .social-proof { background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
                    .button { display: inline-block; background: #e91e63; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
                    .urgency { background: #ffebee; padding: 15px; border-left: 4px solid #f44336; border-radius: 5px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔥 {{ destination_name }} is Hot!</h1>
                        <p>More travelers are joining - don't miss out!</p>
                    </div>
                    <div class="content">
                        <h2>Hey {{ user_name }}!</h2>
                        <p>Exciting update about your {{ destination_name }} interest!</p>
                        
                        <div class="social-proof">
                            <h3>🚀 Growing Interest!</h3>
                            <p style="font-size: 24px; margin: 10px 0;"><strong>{{ similar_interests_count }}</strong> other people</p>
                            <p>are interested in {{ destination_name }} around your travel dates!</p>
                        </div>
                        
                        <div class="highlight">
                            <h3>📅 Your Interest Reminder:</h3>
                            <ul>
                                <li><strong>Destination:</strong> {{ destination_name }}</li>
                                <li><strong>Your Dates:</strong> {{ date_from }} to {{ date_to }}</li>
                                <li><strong>Interest ID:</strong> #{{ interest_id }}</li>
                            </ul>
                        </div>
                        
                        <h3>💡 Why this matters:</h3>
                        <ul>
                            <li><strong>Group formation is closer:</strong> We need just a few more people to form your group!</li>
                            <li><strong>Better pricing coming:</strong> More people = better group discounts for everyone</li>
                            <li><strong>Popular destination:</strong> {{ destination_name }} is trending - perfect time to book!</li>
                        </ul>
                        
                        {% if similar_interests_count >= 3 %}
                        <div class="urgency">
                            <h4>⏰ Almost there!</h4>
                            <p>With {{ similar_interests_count }} people interested, a group could form very soon. Make sure your contact details are up to date so we can notify you immediately!</p>
                        </div>
                        {% endif %}
                        
                        <h3>🎯 Speed things up:</h3>
                        <ol>
                            <li><strong>Share with friends:</strong> Know someone who'd love {{ destination_name }}? Invite them!</li>
                            <li><strong>Flexible dates:</strong> Consider adjusting your dates slightly to match other travelers</li>
                            <li><strong>Spread the word:</strong> Post on social media - you might find travel buddies!</li>
                        </ol>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://travelkit.com/interests/{{ interest_id }}/edit" class="button">Update Your Interest</a>
                            <a href="https://travelkit.com/destinations/{{ destination_name }}/share" class="button" style="background: #2196F3;">Share with Friends</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Questions? We're here to help at <a href="mailto:support@travelkit.com">support@travelkit.com</a></p>
                        <p>Your adventure is calling! 🌍<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
🔥 *{{ destination_name }} is TRENDING!*

Hey {{ user_name }}! 👋

Great news about your {{ destination_name }} interest! 🎊

🚀 *Growing Interest:*
{{ similar_interests_count }} other people are interested in {{ destination_name }} around your dates!

📅 *Your dates:* {{ date_from }} to {{ date_to }}

💡 *This means:*
• Group formation is getting closer!
• Better pricing when more people join
• {{ destination_name }} is a hot destination right now

{% if similar_interests_count >= 3 %}
⏰ *Almost there!* With {{ similar_interests_count }} people interested, a group could form very soon!
{% endif %}

🎯 *Speed it up:*
✅ Share with friends who love travel
✅ Consider flexible dates
✅ Spread the word on social media

🔗 Update your interest: travelkit.com/interests/{{ interest_id }}

Your adventure is calling! 🌍
- TravelKit Team
            """,
            "template_variables": [
                "user_name", "destination_name", "date_from", "date_to",
                "similar_interests_count", "interest_id"
            ]
        },
        {
            "name": "marketing",
            "subject": "🌍 Discover amazing group travel deals!",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #9c27b0 0%, #673ab7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .highlight { background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; background: #9c27b0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🌍 New Adventures Await!</h1>
                        <p>Exclusive travel opportunities just for you</p>
                    </div>
                    <div class="content">
                        <h2>Hi {{ user_name }}!</h2>
                        <p>We have some exciting travel opportunities that we think you'll love!</p>
                        
                        <!-- Marketing content will be customized based on campaign -->
                        <div class="highlight">
                            <h3>✨ Special Offers:</h3>
                            <p>Based on your previous interest, we've found some amazing group travel deals that might interest you.</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://travelkit.com/offers" class="button">Explore Offers</a>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Unsubscribe anytime at <a href="https://travelkit.com/unsubscribe?email={{ user_email }}">travelkit.com/unsubscribe</a></p>
                        <p>Happy travels! 🌍<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
🌍 *New Adventures Await!*

Hi {{ user_name }}! 👋

We have exciting travel opportunities just for you! ✨

Based on your interests, we've found amazing group deals you might love.

🔗 Explore: travelkit.com/offers

Happy travels! 🌍
- TravelKit Team

Reply STOP to unsubscribe
            """,
            "template_variables": ["user_name", "user_email"]
        },
        {
            "name": "document_upload",
            "subject": "📋 New Travel Document - {{ document_name }}",
            "email_template": """
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
                    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
                    .highlight { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
                    .document-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #e0e0e0; }
                    .button { display: inline-block; background: #2196F3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
                    .button-secondary { background: #4CAF50; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 New Travel Document</h1>
                        <p>Your {{ document_category }} is ready</p>
                    </div>
                    <div class="content">
                        <h2>Hi {{ traveler_name }}!</h2>
                        <p>Great news! {{ admin_name }} has uploaded a new travel document for you.</p>
                        
                        <div class="document-box">
                            <h3>📄 Document Details:</h3>
                            <ul>
                                <li><strong>Document Name:</strong> {{ document_name }}</li>
                                <li><strong>Category:</strong> {{ document_category }}</li>
                                <li><strong>Upload Date:</strong> {{ upload_date }}</li>
                                <li><strong>Uploaded by:</strong> {{ admin_name }}</li>
                            </ul>
                        </div>
                        
                        <div class="highlight">
                            <h3>📥 Next Steps:</h3>
                            <ul>
                                <li>Login to your TravelKit dashboard</li>
                                <li>Navigate to the "Travel Documents" section</li>
                                <li>View and download your new document</li>
                                <li>Keep it handy for your upcoming trip!</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{ dashboard_url }}" class="button">View Documents</a>
                        </div>
                        
                        <p><strong>Important:</strong> Please review your document carefully and contact us if you notice any errors.</p>
                    </div>
                    <div class="footer">
                        <p>Questions? Reply to this email or contact support.</p>
                        <p>Safe travels! ✈️<br>The TravelKit Team</p>
                    </div>
                </div>
            </body>
            </html>
            """,
            "whatsapp_template": """
📋 *New Travel Document Available!*

Hi {{ traveler_name }}! 👋

{{ admin_name }} has uploaded a new document for you:

📄 *{{ document_name }}*
📂 Category: {{ document_category }}
📅 Uploaded: {{ upload_date }}

📥 *View your document:*
{{ dashboard_url }}

📱 Login to your TravelKit dashboard → Travel Documents section

Keep this document handy for your trip! ✈️

Questions? Just reply to this message.

- TravelKit Team 🌍
            """,
            "template_variables": ["traveler_name", "document_name", "document_category", "admin_name", "upload_date", "dashboard_url"]
        }
    ]
    
    try:
        for template_data in templates:
            # Check if template already exists
            existing = db.query(NotificationTemplate).filter(
                NotificationTemplate.name == template_data["name"]
            ).first()
            
            if not existing:
                template = NotificationTemplate(
                    name=template_data["name"],
                    subject=template_data["subject"],
                    email_template=template_data["email_template"],
                    whatsapp_template=template_data["whatsapp_template"],
                    template_variables=json.dumps(template_data["template_variables"])
                )
                db.add(template)
                print(f"✅ Created template: {template_data['name']}")
            else:
                print(f"⏭️  Template already exists: {template_data['name']}")
        
        db.commit()
        print("✅ All notification templates created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating templates: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_default_templates()