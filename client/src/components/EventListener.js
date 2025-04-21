import React, { useEffect, useState } from 'react';

function EventListener({ contract }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!contract) return;

    const subscribeToEvents = () => {
      // ItemAdded event
      contract.events.ItemAdded({})
        .on('data', (event) => {
          const { itemId, name, stock, price } = event.returnValues;
          addNewEvent('ItemAdded', `Item ${itemId} (${name}) added with stock: ${stock}, price: ${price}`);
        });

      // ItemPurchased event
      contract.events.ItemPurchased({})
        .on('data', (event) => {
          const { itemId, buyer, quantity } = event.returnValues;
          addNewEvent('ItemPurchased', `Item ${itemId} purchased by ${buyer}, quantity: ${quantity}`);
        });

      // StockUpdated event
      contract.events.StockUpdated({})
        .on('data', (event) => {
          const { itemId, newStock } = event.returnValues;
          addNewEvent('StockUpdated', `Item ${itemId} stock updated to ${newStock}`);
        });

      // PriceUpdated event
      contract.events.PriceUpdated({})
        .on('data', (event) => {
          const { itemId, newPrice } = event.returnValues;
          addNewEvent('PriceUpdated', `Item ${itemId} price updated to ${newPrice}`);
        });

      // ThresholdUpdated event
      contract.events.ThresholdUpdated({})
        .on('data', (event) => {
          const { itemId, newThreshold } = event.returnValues;
          addNewEvent('ThresholdUpdated', `Item ${itemId} threshold updated to ${newThreshold}`);
        });

      // LowStock event
      contract.events.LowStock({})
        .on('data', (event) => {
          const { itemId, stock, threshold } = event.returnValues;
          addNewEvent('LowStock', `Low stock alert for item ${itemId}! Current stock: ${stock}, Threshold: ${threshold}`);
        });

      // Staff events
      contract.events.StaffAdded({})
        .on('data', (event) => {
          addNewEvent('StaffAdded', `Staff member added: ${event.returnValues.account}`);
        });

      contract.events.StaffRemoved({})
        .on('data', (event) => {
          addNewEvent('StaffRemoved', `Staff member removed: ${event.returnValues.account}`);
        });

      // Contract state events
      contract.events.Paused({})
        .on('data', (event) => {
          addNewEvent('Paused', `Contract paused by: ${event.returnValues.by}`);
        });

      contract.events.Unpaused({})
        .on('data', (event) => {
          addNewEvent('Unpaused', `Contract unpaused by: ${event.returnValues.by}`);
        });

      // Withdrawal event
      contract.events.Withdrawal({})
        .on('data', (event) => {
          const { owner, amount } = event.returnValues;
          addNewEvent('Withdrawal', `${amount} wei withdrawn by ${owner}`);
        });
    };

    subscribeToEvents();
  }, [contract]);

  const addNewEvent = (type, message) => {
    const newEvent = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleString()
    };
    setEvents(prevEvents => [newEvent, ...prevEvents].slice(0, 100)); // Keep last 100 events
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Event Log</h2>
      <div className="max-h-96 overflow-y-auto">
        {events.map(event => (
          <div key={event.id} className="mb-2 p-2 border rounded">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-600">{event.type}</span>
              <span className="text-sm text-gray-500">{event.timestamp}</span>
            </div>
            <p className="text-gray-700">{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventListener;