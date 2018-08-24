
```
function makeConstant() {
    //
}

const Singleton = {
    staticVar: makeConstant(),
    singletonMethod: function() {

    }
}
```

```
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
}

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