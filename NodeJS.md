
## Singletons

```javascript
function makeConstant() {
    //
}

const ObjectSingleton = {
    staticVar: makeConstant(),
    singletonMethod: function() { this.staticVar++; /* ... */ }
};

const ConstuctionSingleton1 = (() => {
    const pub = { };
    let privateStaticVar;
    pub.publicStaticVar = 0;
    pub.singletonMethod = () => { /* */ };
})( );

const ConstuctionSingleton2 = (function () {
    const pub = { };
    let privateStaticVar = 0;
    pub.publicStaticVar = 0;
    pub.singletonMethod = function() { /* */ }
})( );

```

## Class methods

Class method instantiation: Instance methods cannot be called from a class object, only class instances. Instance methods are instantiated (recreated) every time a class instance is created.

```javascript
function print(msg) {
  console.log(`MyClass: ${msg}`)
}

const MyClass = function(x,y,z) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.instanceMethod = (function() {
    print("instantiating instanceMethod()");
    return function() {
      console.log("instanceMethod");
    }
  } ( ));
};

// prototype methods
// in the class object, prototype methods must be declared
MyClass.prototype.prototypeMethod = (function() {
  print("instantiating prototypeMethod()");
  return function() {
    console.log("prototypeMethod");
  }
} ( ));

// static methods are declared once and cannot be accessed inside
MyClass.staticMethod = (function() {
  print("instantiating staticMethod()");
  return function() {
    console.log("staticMethod");
  }
} ( ));

// each time a new instance of MyClass is created
const myClass1 = new MyClass(1,2,3);
const myClass2 = new MyClass(1,2,3);

MyClass.staticMethod();
MyClass.prototype.prototypeMethod();
myClass1.prototypeMethod();
myClass1.instanceMethod();

// object instances can't access static methods
// myClass1.staticMethod();

print("here are the MyClass members");
console.log(Object.keys(MyClass));
print("here are the MyClass prototype members");
console.log(Object.keys(MyClass.prototype));
print("here are the myClass1 members");
console.log(Object.keys(myClass1));

// object instances don't have a prototype
// console.log(Object.keys(myClass1.prototype));

```

## Memory optimization 

```javascript
function myFunction() {
  function myInnerFunction() {
    print("instantiating myInnerFunction()");
  }
  myInnerFunction();
}

myFunction();
```

Since myFunction has a function declaration of myInnerFunction inside myFunction's scope, then myInnerFunction will be instantiated every time myFunction is called. To avoid this use a function constructor. This way you can remove the additional load a function has on the processor to allocate and remove memory for myInnerFunction each time myFunction is called.

```javascript

const myFunction = (() => {
  function myInnerFunction() {
      print("instantiating myInnerFunction()");
    }
    
    return function() {
      myInnerFunction();
    }
})( );

myFunction();
```