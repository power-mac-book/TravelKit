import { AlertCircle, TrendingUp, Users, Clock } from 'lucide-react';
import { HomepageMessage } from '@/types';

interface SocialProofBannerProps {
  message: HomepageMessage;
}

export default function SocialProofBanner({ message }: SocialProofBannerProps) {
  const getIcon = () => {
    switch (message.message_type) {
      case 'trending':
        return <TrendingUp className="w-5 h-5" />;
      case 'shortage':
        return <AlertCircle className="w-5 h-5" />;
      case 'urgency':
        return <Clock className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getBgColor = () => {
    switch (message.message_type) {
      case 'trending':
        return 'bg-gradient-to-r from-red-500 to-pink-500';
      case 'shortage':
        return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'urgency':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500';
      default:
        return 'bg-gradient-to-r from-primary-500 to-primary-600';
    }
  };

  return (
    <div className={`${getBgColor()} text-white p-4 rounded-lg shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{message.title}</h3>
            <p className="text-white/90">{message.message}</p>
          </div>
        </div>
        
        {message.cta_text && message.cta_link && (
          <button className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            {message.cta_text}
          </button>
        )}
      </div>
    </div>
  );
}