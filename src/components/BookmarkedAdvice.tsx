
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, BookmarkCheck } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isBookmarked?: boolean;
}

interface BookmarkedAdviceProps {
  bookmarkedMessages: Message[];
  onBack: () => void;
}

export const BookmarkedAdvice: React.FC<BookmarkedAdviceProps> = ({ bookmarkedMessages, onBack }) => {
  return (
    <div className="h-screen bg-gradient-to-br from-warm-beige-50 to-soft-peach-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-warm-beige-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <div>
            <h1 className="font-playfair font-semibold text-xl text-gray-900">Saved Career Advice</h1>
            <p className="text-sm text-gray-600">Your personal collection of insights</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {bookmarkedMessages.length === 0 ? (
            <div className="text-center py-12">
              <BookmarkCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-playfair text-xl text-gray-600 mb-2">No saved advice yet</h3>
              <p className="text-gray-500">Start a conversation and bookmark valuable insights to build your personal career guidance library.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="font-playfair text-2xl font-semibold text-gray-900 mb-2">
                  Your Career Insights
                </h2>
                <p className="text-gray-600">
                  {bookmarkedMessages.length} piece{bookmarkedMessages.length !== 1 ? 's' : ''} of advice saved
                </p>
              </div>

              {bookmarkedMessages.map((message, index) => (
                <Card key={message.id} className="p-6 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border-warm-beige-200">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full bg-warm-beige-500 flex items-center justify-center text-white font-semibold">
                      AI
                    </div>
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed mb-3">
                        {message.content}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Saved on {message.timestamp.toLocaleDateString()}</span>
                        <div className="flex items-center text-soft-peach-600">
                          <BookmarkCheck className="w-4 h-4 mr-1" />
                          Saved
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
