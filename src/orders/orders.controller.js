const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
    const { orderId } = req.params;
    res.json({ data: orders.filter(orderId ? order => order.id === orderId : () => true) });
};

function bodyDataHas(propertyName) {
    return function (req, res, next) {
      const { data = {} } = req.body;
      if (data[propertyName]) {
        return next();
      }
      next({
          status: 400,
          message: `Order must include a ${propertyName}`
      });
    };
};

function validateDishesArray(req, res, next) {
    const { data = {} } = req.body;
    const dishes = data['dishes'];
    // Check if dishes is undefined or not an array
    if (dishes === undefined || !Array.isArray(dishes)) {
      return next({
        status: 400,
        message: "Dishes array is missing or invalid. Order must include at least one dish",
      });
    }
  
    // Check if dishes array is empty
    if (dishes.length === 0) {
      return next({
        status: 400,
        message: "Dishes array is empty. Order must include at least one dish",
      });
    }
  
    // Proceed to the next middleware if validation passes
    next();
  }

  function validateDishQuantities(req, res, next) {
    const { data = {} } = req.body;
    const dishes = data['dishes'];
  
    for (let index = 0; index < dishes.length; index++) {
      const { quantity } = dishes[index];
  
      if (quantity === undefined) {
        return next({
          status: 400,
          message: `Dish ${index} must have a quantity that is an integer greater than 0.`,
        });
      }
  
      if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
        return next({
          status: 400,
          message: `Dish ${index} must have a quantity that is an integer greater than 0.`,
        });
      }

      if ( quantity <= 0 ) {
        return next({
          status: 400,
          message: `Dish ${index} must have a quantity that is an integer greater than 0.`,
        });
      }
    }
  
    next(); 
};

function statusPropertyIsValid(req, res, next) {
    const { data: { status } = {} } = req.body;
    const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
    if (validStatus.includes(status)) {
      return next();
    }
    next({
      status: 400,
      message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
};

function statusIsNotPending(req, res, next) {
    const { data = {} } = req.body;
    const status = data['status'];
    // Check if dishes is undefined or not an array
    if (status !== "pending") {
      next({
        status: 400,
        message: "An order cannot be deleted unless it is pending.",
      });
    }
    next();
};

function create(req, res) {
    const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
    const newOrder = {
      id: nextId(), 
      deliverTo: deliverTo,
      mobileNumber: mobileNumber,
      status: status,
      dishes: dishes,
    };
    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
};

function orderExists(req, res, next) {
    const { orderId } = req.params;
    const foundOrder = orders.find(order => order.id === orderId);
    if (foundOrder) {
      res.locals.order = foundOrder;
      return next();
    }
    next({
      status: 404,
      message: `Order id not found: ${orderId}`,
    });
};

function read(req, res, next) {
    res.json({ data: res.locals.order });
};

function update(req, res, next) {
    const order = res.locals.order;
    const { orderId } = req.params;
    const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } = req.body;
    if (id && id !== orderId) {
        next({
          status: 400,
          message: `Order id in the body does not match route id. Order: ${id}, Route: ${orderId}`,
        });
      }

    // update the order
    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;
  
    res.json({ data: order });
};

function destroy(req, res, next) {
    const { orderId } = req.params;
    const orderToDelete = orders.find((order) => order.id === orderId);
    
    if (orderToDelete.status !== 'pending') {
        next({
            status: 400,
            message: "An order cannot be deleted unless it is pending",
        }); 
      }

    // Delete the order if it meets the conditions
    const deletedIndex = orders.indexOf(orderToDelete);
    orders.splice(deletedIndex, 1);
    res.sendStatus(204);
  }

module.exports = {
    create:[
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        validateDishesArray,
        validateDishQuantities,
        create,
    ],
    list,
    read: [orderExists, read],
    update: [
        orderExists,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        validateDishesArray,
        validateDishQuantities,
        statusPropertyIsValid,
        update,
    ],
    delete: [orderExists, destroy],
};