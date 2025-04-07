class Test{
    public:
        int size = 0;
        int a[5];
        virtual void push_back(int elem) = 0;
};

class Summer : public Test{
    public:
    void push_back(int elem){
        a[size] = elem;
        size++;
    }
};