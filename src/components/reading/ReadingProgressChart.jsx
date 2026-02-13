import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReadingProgressChart({ progressHistory }) {
  if (!progressHistory || progressHistory.length === 0) {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-lg">
        <h3 className="font-bold text-lg mb-4">📈 Votre progression</h3>
        <p className="text-center text-gray-500 text-sm py-8">
          Pas encore d'historique de progression
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h3 className="font-bold text-lg mb-4">📈 Votre progression</h3>
      
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={progressHistory}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#999"
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '2px solid #FF69B4',
              borderRadius: '8px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="page" 
            stroke="#FF69B4" 
            strokeWidth={3}
            dot={{ fill: '#FF69B4', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}