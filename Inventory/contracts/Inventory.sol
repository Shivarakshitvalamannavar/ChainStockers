// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Inventory {
    address public owner;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    modifier onlyWhenActive() {
        require(!paused, "Contract is paused");
        _;
    }
    modifier onlyStaffOrOwner() {
        require(msg.sender == owner || staff[msg.sender], "Not authorized");
        _;
    }

    struct Item {
        string name;
        uint256 stock;
        uint256 price;    // in wei per unit
        uint256 reorderThreshold;
        bool exists;
    }

    struct Purchase {
        address buyer;
        uint256 quantity;
        uint256 timestamp;
    }

    mapping(uint256 => Item) public items;
    mapping(uint256 => Purchase[]) private purchaseHistory;
    mapping(address => bool) public staff;

    uint256 public nextItemId;

    event ItemAdded(uint256 indexed itemId, string name, uint256 stock, uint256 price);
    event StockUpdated(uint256 indexed itemId, uint256 newStock);
    event PriceUpdated(uint256 indexed itemId, uint256 newPrice);
    event ThresholdUpdated(uint256 indexed itemId, uint256 newThreshold);
    event ItemRemoved(uint256 indexed itemId);
    event ItemPurchased(uint256 indexed itemId, address buyer, uint256 quantity);
    event LowStock(uint256 indexed itemId, uint256 stock, uint256 threshold);
    event Withdrawal(address indexed owner, uint256 amount);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event StaffAdded(address indexed account);
    event StaffRemoved(address indexed account);

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        if (_paused) emit Paused(msg.sender);
        else emit Unpaused(msg.sender);
    }

    function updateStaff(address account, bool isStaff) external onlyOwner {
        staff[account] = isStaff;
        if (isStaff) emit StaffAdded(account);
        else emit StaffRemoved(account);
    }

    function addItem(
        string calldata name,
        uint256 initialStock,
        uint256 price,
        uint256 reorderThreshold
    ) external onlyOwner onlyWhenActive {
        items[nextItemId] = Item(name, initialStock, price, reorderThreshold, true);
        emit ItemAdded(nextItemId, name, initialStock, price);
        nextItemId++;
    }

    function restock(uint256 itemId, uint256 amount) external onlyStaffOrOwner onlyWhenActive {
        require(items[itemId].exists, "Item does not exist");
        items[itemId].stock += amount;
        emit StockUpdated(itemId, items[itemId].stock);
    }

    function updatePrice(uint256 itemId, uint256 newPrice) external onlyOwner onlyWhenActive {
        require(items[itemId].exists, "Item does not exist");
        items[itemId].price = newPrice;
        emit PriceUpdated(itemId, newPrice);
    }

    function updateThreshold(uint256 itemId, uint256 newThreshold) external onlyOwner onlyWhenActive {
        require(items[itemId].exists, "Item does not exist");
        items[itemId].reorderThreshold = newThreshold;
        emit ThresholdUpdated(itemId, newThreshold);
    }

    function removeItem(uint256 itemId) external onlyOwner onlyWhenActive {
        require(items[itemId].exists, "Item does not exist");
        delete items[itemId];
        delete purchaseHistory[itemId];
        emit ItemRemoved(itemId);
    }

    function purchase(uint256 itemId, uint256 quantity) external payable onlyWhenActive {
        Item storage it = items[itemId];
        require(it.exists, "Item does not exist");
        require(it.stock >= quantity, "Insufficient stock");

        uint256 totalCost = it.price * quantity;
        require(msg.value == totalCost, "Incorrect payment");

        it.stock -= quantity;
        purchaseHistory[itemId].push(Purchase(msg.sender, quantity, block.timestamp));
        emit ItemPurchased(itemId, msg.sender, quantity);

        if (it.stock <= it.reorderThreshold) {
            emit LowStock(itemId, it.stock, it.reorderThreshold);
        }
    }

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "No funds");
        payable(owner).transfer(bal);
        emit Withdrawal(owner, bal);
    }

    function getPurchaseCount(uint256 itemId) external view returns (uint256) {
        return purchaseHistory[itemId].length;
    }

    function getPurchase(uint256 itemId, uint256 index)
        external
        view
        returns (address buyer, uint256 quantity, uint256 timestamp)
    {
        Purchase storage p = purchaseHistory[itemId][index];
        return (p.buyer, p.quantity, p.timestamp);
    }

    /// @notice Retrieve all existing items (ids, names, stocks, prices, thresholds)
    function getAllItems()
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory names,
            uint256[] memory stocks,
            uint256[] memory prices,
            uint256[] memory thresholds
        )
    {
        uint total = nextItemId;
        uint count = 0;
        for (uint i = 0; i < total; i++) {
            if (items[i].exists) {
                count++;
            }
        }

        ids = new uint256[](count);
        names = new string[](count);
        stocks = new uint256[](count);
        prices = new uint256[](count);
        thresholds = new uint256[](count);

        uint idx = 0;
        for (uint i = 0; i < total; i++) {
            Item storage it = items[i];
            if (it.exists) {
                ids[idx] = i;
                names[idx] = it.name;
                stocks[idx] = it.stock;
                prices[idx] = it.price;
                thresholds[idx] = it.reorderThreshold;
                idx++;
            }
        }

        return (ids, names, stocks, prices, thresholds);
    }

     
    function verifyTransaction(uint256 itemId, uint256 index)
        external
        view
        onlyOwner
        returns (address buyer, uint256 quantity, uint256 timestamp)
    {
        require(items[itemId].exists, "Item does not exist");
        require(index < purchaseHistory[itemId].length, "Invalid index");
        Purchase storage p = purchaseHistory[itemId][index];
        return (p.buyer, p.quantity, p.timestamp);
    }

}
