// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SupplyChain {
    enum Status { Created, InTransit, Delivered }

    struct TrackingUpdate {
        Status status;
        uint timestamp;
        address updater;
        string locationData;
        int256 latitude;
        int256 longitude;
        string condition;
    }

    struct Product {
        uint id;
        string name;
        string origin;
        TrackingUpdate[] history;
    }

    address public owner;
    mapping(address => bool) public authorizedSuppliers;
    mapping(uint => Product) public products;
    uint256 public productCount;
    uint256[] public productIds;

    event SupplierAdded(address indexed supplier);
    event SupplierRemoved(address indexed supplier);
    event ProductAdded(uint indexed id, string name, string origin, address indexed updater, string locationData, int256 latitude, int256 longitude, string condition);
    event ProductStatusUpdated(uint indexed id, Status status, address indexed updater, string locationData, int256 latitude, int256 longitude, string condition);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedSuppliers[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addSupplier(address _supplier) public onlyOwner {
        authorizedSuppliers[_supplier] = true;
        emit SupplierAdded(_supplier);
    }

    function removeSupplier(address _supplier) public onlyOwner {
        authorizedSuppliers[_supplier] = false;
        emit SupplierRemoved(_supplier);
    }

    function addProduct(uint _id, string memory _name, string memory _origin, string memory _locationData, int256 _latitude, int256 _longitude) public onlyAuthorized {
        require(products[_id].history.length == 0, "Product already exists");

        productCount++;
        productIds.push(_id);

        Product storage p = products[_id];
        p.id = _id;
        p.name = _name;
        p.origin = _origin;
        
        p.history.push(TrackingUpdate({
            status: Status.Created,
            timestamp: block.timestamp,
            updater: msg.sender,
            locationData: _locationData,
            latitude: _latitude,
            longitude: _longitude,
            condition: "New"
        }));

        emit ProductAdded(_id, _name, _origin, msg.sender, _locationData, _latitude, _longitude, "New");
    }

    function updateProductStatus(uint _id, uint _status, string memory _locationData, int256 _latitude, int256 _longitude, string memory _condition) public onlyAuthorized {
        Product storage p = products[_id];
        require(p.history.length > 0, "Product does not exist");
        require(_status <= uint(Status.Delivered), "Invalid status");

        p.history.push(TrackingUpdate({
            status: Status(_status),
            timestamp: block.timestamp,
            updater: msg.sender,
            locationData: _locationData,
            latitude: _latitude,
            longitude: _longitude,
            condition: _condition
        }));

        emit ProductStatusUpdated(_id, Status(_status), msg.sender, _locationData, _latitude, _longitude, _condition);
    }

    function getProductHistory(uint _id) public view returns (TrackingUpdate[] memory) {
        require(products[_id].history.length > 0, "Product does not exist");
        return products[_id].history;
    }

    function getProduct(uint _id) public view returns (
        uint id,
        string memory name,
        string memory origin,
        TrackingUpdate[] memory history
    ) {
        require(products[_id].history.length > 0, "Product does not exist");
        Product memory p = products[_id];
        return (p.id, p.name, p.origin, p.history);
    }

    function getAllProducts() public view returns (Product[] memory) {
        Product[] memory allProducts = new Product[](productCount);
        for (uint i = 0; i < productCount; i++) {
            allProducts[i] = products[productIds[i]];
        }
        return allProducts;
    }
}
