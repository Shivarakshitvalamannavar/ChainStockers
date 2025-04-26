import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import InventoryContract from './contracts/Inventory.json';
import EventListener from './components/EventListener';
import './App.css';

function App() {
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', stock: '', price: '', threshold: '' });
  const [paused, setPaused] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  const loadItems = async (contractInstance) => {
    try {
      const data = await contractInstance.methods.getAllItems().call();
      const items = [];

      const ids = data.ids;
      const names = data.names;
      const stocks = data.stocks;
      const prices = data.prices;
      const thresholds = data.thresholds;

      for (let i = 0; i < ids.length; i++) {
        items.push({
          id: Number(ids[i]),
          name: names[i],
          stock: Number(stocks[i]),
          price: Number(prices[i]),
          threshold: Number(thresholds[i])
        });
      }

      setItems(items);
    } catch (err) {
      console.error("loadItems error:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const accounts = await web3.eth.getAccounts();
          setAccount(accounts[0]);

          const networkId = await web3.eth.net.getId();
          const deployedNetwork = InventoryContract.networks[networkId];
          if (!deployedNetwork) {
            alert("Smart contract not deployed to the detected network.");
            return;
          }

          const instance = new web3.eth.Contract(
            InventoryContract.abi,
            deployedNetwork.address
          );
          setContract(instance);

          // Check if current user is owner
          const owner = await instance.methods.owner().call();
          setIsOwner(accounts[0].toLowerCase() === owner.toLowerCase());

          // Check if current user is staff
          const staffStatus = await instance.methods.staff(accounts[0]).call();
          setIsStaff(staffStatus);

          // Get contract pause status
          const pausedStatus = await instance.methods.paused().call();
          setPaused(pausedStatus);

          // Load items with the contract instance directly
          await loadItems(instance);

        } catch (err) {
          console.error("Error initializing web3 or contract:", err);
        }
      } else {
        alert("Please install MetaMask!");
      }
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addItem = async (e) => {
    e.preventDefault();
    try {
      await contract.methods
        .addItem(form.name, form.stock, form.price, form.threshold)
        .send({ from: account });
      await loadItems(contract);
      setForm({ name: '', stock: 0, price: 0, threshold: 0 });
    } catch (err) {
      console.error("Error adding item:", err);
      alert("Failed to add item. Make sure you are the owner.");
    }
  };

  const purchaseItem = async (id) => {
    const qty = window.prompt('Quantity to purchase?');
    if (!qty) return;

    try {
      const price = items.find(it => it.id === id).price;
      await contract.methods
        .purchase(id, qty)
        .send({ from: account, value: price * qty });
      await loadItems(contract);
    } catch (err) {
      console.error("Error purchasing item:", err);
      alert("Failed to purchase item.");
    }
  };

  const restockItem = async (id) => {
    const amount = window.prompt("Enter amount to restock:");
    if (!amount) return;

    try {
      await contract.methods.restock(id, amount)
        .send({ from: account });
      await loadItems(contract);
    } catch (err) {
      console.error("Error restocking:", err);
      alert("Failed to restock. Make sure you are staff or owner.");
    }
  };

  const updatePrice = async (id) => {
    const newPrice = window.prompt("Enter new price (in wei):");
    if (!newPrice) return;

    try {
      await contract.methods.updatePrice(id, newPrice)
        .send({ from: account });
      await loadItems(contract);
    } catch (err) {
      console.error("Error updating price:", err);
      alert("Failed to update price. Make sure you are the owner.");
    }
  };

  const updateThreshold = async (id) => {
    const newThreshold = window.prompt("Enter new reorder threshold:");
    if (!newThreshold) return;

    try {
      await contract.methods.updateThreshold(id, newThreshold)
        .send({ from: account });
      await loadItems(contract);
    } catch (err) {
      console.error("Error updating threshold:", err);
      alert("Failed to update threshold. Make sure you are the owner.");
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Are you sure you want to remove this item?")) return;

    try {
      await contract.methods.removeItem(id)
        .send({ from: account });
      await loadItems(contract);
    } catch (err) {
      console.error("Error removing item:", err);
      alert("Failed to remove item. Make sure you are the owner.");
    }
  };

  const updateStaffStatus = async () => {
    const staffAddress = window.prompt("Enter staff address:");
    const makeStaff = window.confirm("Add as staff? Cancel to remove staff status.");
    if (!staffAddress) return;

    try {
      await contract.methods.updateStaff(staffAddress, makeStaff)
        .send({ from: account });
      alert("Staff Status updated successfully");
    } catch (err) {
      console.error("Error updating staff status:", err);
      alert("Failed to update staff status. Make sure you are the owner.");
    }
  };

  const withdrawFunds = async () => {
    try {
      await contract.methods.withdraw()
        .send({ from: account });
      alert("Funds withdrawn successfully");
    } catch (err) {
      console.error("Error withdrawing funds:", err);
      alert("Failed to withdraw funds. Make sure you are the owner.");
    }
  };

  const togglePause = async () => {
    try {
      await contract.methods.setPaused(!paused)
        .send({ from: account });
      setPaused(!paused);
    } catch (err) {
      console.error("Error toggling pause state:", err);
      alert("Failed to toggle pause state. Make sure you are the owner.");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory DApp</h1>

      {/* Admin Controls */}
      {isOwner && (
        <div className="mb-4 space-x-2">
          <button onClick={togglePause} className="bg-red-500 text-white px-3 py-1 rounded">
            {paused ? 'Unpause Contract' : 'Pause Contract'}
          </button>
          <button onClick={withdrawFunds} className="bg-green-500 text-white px-3 py-1 rounded">
            Withdraw Funds
          </button>
          <button onClick={updateStaffStatus} className="bg-blue-500 text-white px-3 py-1 rounded">
            Manage Staff
          </button>
        </div>
      )}

      {/* Add Item Form */}
      {isOwner && (
        <div className="mb-6">
          <h2 className="text-xl mb-2">Add New Item</h2>
          <form onSubmit={addItem} className="space-y-2">
            <input name="name" placeholder="Name" value={form.name} onChange={handleChange} className="border p-1" />
            <input name="stock" type="number" placeholder="Stock" value={form.stock} onChange={handleChange} className="border p-1" />
            <input name="price" type="number" placeholder="Price (wei)" value={form.price} onChange={handleChange} className="border p-1" />
            <input name="threshold" type="number" placeholder="Reorder Threshold" value={form.threshold} onChange={handleChange} className="border p-1" />
            <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Add Item</button>
          </form>
        </div>
      )}

      {/* Items Table */}
      <h2 className="text-xl mb-2">Available Items</h2>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Stock</th>
            <th>Price (wei)</th>
            <th>Threshold</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id} className="text-center">
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.stock}</td>
              <td>{item.price}</td>
              <td>{item.threshold}</td>
              <td className="space-x-2">
                {(!isStaff && !isOwner) &&
                  (<button onClick={() => purchaseItem(item.id)} className="bg-green-500 text-white px-2 py-1 rounded">
                    Buy
                  </button>
                  )}
                {(isOwner || isStaff) && (
                  <button onClick={() => restockItem(item.id)} className="bg-blue-500 text-white px-2 py-1 rounded">
                    Restock
                  </button>
                )}
                {isOwner && (
                  <>
                    <button onClick={() => updatePrice(item.id)} className="bg-yellow-500 text-white px-2 py-1 rounded">
                      Update Price
                    </button>
                    <button onClick={() => updateThreshold(item.id)} className="bg-purple-500 text-white px-2 py-1 rounded">
                      Update Threshold
                    </button>
                    <button onClick={() => removeItem(item.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <EventListener contract={contract} />
    </div>
  );
}

export default App;